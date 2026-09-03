import { FarmLocation, RainfallData, SoilData, WeatherData } from './types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type GeoAddress = { state?: string; state_district?: string; region?: string; county?: string; country?: string };
type GeoRow = { display_name: string; lat?: string; lon?: string; address?: GeoAddress };
function placeFromAddress(address: GeoAddress | undefined) {
  return { region: address?.state ?? address?.state_district ?? address?.region ?? address?.county, country: address?.country };
}

export async function searchPlaces(query: string): Promise<FarmLocation[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`;
  const rows = await fetchJson<GeoRow[]>(url, {
    headers: { 'User-Agent': 'AgroCast/1.0 (farm weather mobile app)' },
  });
  return rows.map((row) => ({
    name: row.display_name,
    latitude: Number(row.lat),
    longitude: Number(row.lon),
    ...placeFromAddress(row.address),
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<FarmLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`;
  const row = await fetchJson<GeoRow>(url, {
    headers: { 'User-Agent': 'AgroCast/1.0 (farm weather mobile app)' },
  });
  return { name: row.display_name ?? 'My farm', latitude, longitude, ...placeFromAddress(row.address) };
}

export async function fetchWeather(location: FarmLocation): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,et0_fao_evapotranspiration',
    timezone: 'auto',
    forecast_days: '7',
  });
  type Raw = {
    timezone: string;
    current: Record<string, number>;
    daily: Record<string, Array<number | string>>;
  };
  const raw = await fetchJson<Raw>(`https://api.open-meteo.com/v1/forecast?${params}`);
  return {
    timezone: raw.timezone,
    current: {
      temperature: raw.current.temperature_2m ?? 0,
      apparentTemperature: raw.current.apparent_temperature ?? 0,
      humidity: raw.current.relative_humidity_2m ?? 0,
      precipitation: raw.current.precipitation ?? 0,
      weatherCode: raw.current.weather_code ?? 0,
      windSpeed: raw.current.wind_speed_10m ?? 0,
    },
    daily: (raw.daily.time as string[]).map((date, i) => ({
      date,
      weatherCode: Number(raw.daily.weather_code?.[i] ?? 0),
      temperatureMax: Number(raw.daily.temperature_2m_max?.[i] ?? 0),
      temperatureMin: Number(raw.daily.temperature_2m_min?.[i] ?? 0),
      precipitation: Number(raw.daily.precipitation_sum?.[i] ?? 0),
      precipitationProbability: Number(raw.daily.precipitation_probability_max?.[i] ?? 0),
      windSpeedMax: Number(raw.daily.wind_speed_10m_max?.[i] ?? 0),
      apparentTemperatureMax: Number(raw.daily.apparent_temperature_max?.[i] ?? raw.daily.temperature_2m_max?.[i] ?? 0),
      uvIndexMax: Number(raw.daily.uv_index_max?.[i] ?? 0),
      evapotranspiration: Number(raw.daily.et0_fao_evapotranspiration?.[i] ?? 0),
    })),
  };
}

export async function fetchRainfall(location: FarmLocation): Promise<RainfallData> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = currentYear - 10; // ten complete years before this one
  const endDate = `${currentYear}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // 1) Long-run history from the Open-Meteo ERA5 reanalysis archive. It is the
  //    measured record, but it is published ~5 days behind the live date.
  type Daily = { daily: { time: string[]; precipitation_sum: Array<number | null> } };
  const archive = await fetchJson<Daily>(`https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: `${startYear}-01-01`,
    end_date: endDate,
    daily: 'precipitation_sum',
    timezone: 'auto',
  })}`);

  // Keep only published days — nulls are dates ERA5 has not produced yet.
  const days = archive.daily.time.map((date, i) => {
    const [y, m, d] = date.split('-').map(Number);
    const mm = archive.daily.precipitation_sum[i];
    return { y, m, d, mm: mm == null || !Number.isFinite(mm) ? null : mm };
  }).filter((day): day is { y: number; m: number; d: number; mm: number } => day.mm !== null);

  const monthKey = (y: number, m: number) => `${y}-${m}`;
  const monthTotal = new Map<string, number>();
  days.forEach((day) => monthTotal.set(monthKey(day.y, day.m), (monthTotal.get(monthKey(day.y, day.m)) ?? 0) + day.mm));

  // The newest published day of this year defines the fair comparison window
  // (this year is incomplete, so prior years are only counted up to the same date).
  const yearDays = days.filter((day) => day.y === currentYear);
  const latest = yearDays.length ? yearDays[yearDays.length - 1] : null;
  const window = latest ? { m: latest.m, d: latest.d } : { m: now.getMonth() + 1, d: now.getDate() };
  const within = (day: { m: number; d: number }) => day.m < window.m || (day.m === window.m && day.d <= window.d);

  // Per-month climatology over the ten prior complete years, plus this year's totals.
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const normals: number[] = [];
    for (let year = startYear; year < currentYear; year += 1) {
      const total = monthTotal.get(monthKey(year, month));
      if (total !== undefined) normals.push(total);
    }
    return {
      month,
      normal: normals.length ? normals.reduce((a, b) => a + b, 0) / normals.length : 0,
      recent: monthTotal.get(monthKey(currentYear, month)) ?? 0,
    };
  });

  // Year-to-date observed, vs the typical year-to-date over the same window.
  let currentYearTotal = 0;
  const ytdPerYear = new Map<number, number>();
  days.forEach((day) => {
    if (day.y === currentYear) currentYearTotal += day.mm;
    else if (day.y >= startYear && within(day)) ytdPerYear.set(day.y, (ytdPerYear.get(day.y) ?? 0) + day.mm);
  });
  const normalToDate = ytdPerYear.size ? [...ytdPerYear.values()].reduce((a, b) => a + b, 0) / ytdPerYear.size : 0;

  const currentMonth = now.getMonth() + 1;
  const currentMonthDays = days
    .filter((day) => day.y === currentYear && day.m === currentMonth)
    .map((day) => ({ date: `${day.y}-${pad(day.m)}-${pad(day.d)}`, rainfall: day.mm }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2) Yesterday / today / next 7 days from the live forecast model, which ERA5
  //    has not published yet. `past_days: 1` makes the daily array start yesterday,
  //    so index 1 is today and the following entries are the 7-day outlook.
  let recentRain: RainfallData['recentRain'] = { yesterday: null, today: null, weekTotal: null };
  try {
    const recent = await fetchJson<Daily>(`https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      daily: 'precipitation_sum',
      past_days: '1',
      forecast_days: '7',
      timezone: 'auto',
    })}`);
    const times = recent.daily.time;
    const vals = recent.daily.precipitation_sum;
    const at = (i: number) => {
      const v = vals[i];
      return v == null || !Number.isFinite(v) ? 0 : v;
    };
    let weekTotal = 0;
    for (let i = 1; i < times.length && i < 8; i += 1) weekTotal += at(i);
    recentRain = {
      yesterday: { date: times[0] ?? '', rainfall: at(0) },
      today: { date: times[1] ?? '', rainfall: at(1) },
      weekTotal,
    };
  } catch {
    // ERA5 history is still returned even if the live outlook is unavailable.
  }

  return {
    months,
    normalPeriod: `${startYear}–${currentYear - 1} average`,
    recentPeriod: String(currentYear),
    currentYear,
    currentYearTotal,
    normalToDate,
    currentMonth: { month: currentMonth, total: currentMonthDays.reduce((sum, day) => sum + day.rainfall, 0), days: currentMonthDays },
    recentRain,
  };
}

export async function fetchSoil(location: FarmLocation): Promise<SoilData> {
  const props = ['clay', 'sand', 'silt', 'phh2o'];
  const params = new URLSearchParams({ lon: String(location.longitude), lat: String(location.latitude), depth: '0-5cm', value: 'mean' });
  props.forEach((p) => params.append('property', p));
  type SoilResponse = { properties: { layers: Array<{ name: string; depths: Array<{ values: { mean: number | null } }> }> } };
  const raw = await fetchJson<SoilResponse>(`https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`);
  const get = (name: string) => raw.properties.layers.find((l) => l.name === name)?.depths[0]?.values.mean ?? null;
  const clay = get('clay'); const sand = get('sand'); const silt = get('silt'); const phRaw = get('phh2o');
  const largest = Math.max(clay ?? 0, sand ?? 0, silt ?? 0);
  const texture = largest === 0 ? 'Unknown' : largest === sand ? 'Sandy' : largest === clay ? 'Clay-rich' : 'Silty';
  return { clay: clay === null ? null : clay / 10, sand: sand === null ? null : sand / 10, silt: silt === null ? null : silt / 10, ph: phRaw === null ? null : phRaw / 10, texture };
}
