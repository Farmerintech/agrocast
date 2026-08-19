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

export async function searchPlaces(query: string): Promise<FarmLocation[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`;
  const rows = await fetchJson<Array<{ display_name: string; lat: string; lon: string }>>(url, {
    headers: { 'User-Agent': 'AgroCast/1.0 (farm weather mobile app)' },
  });
  return rows.map((row) => ({
    name: row.display_name,
    latitude: Number(row.lat),
    longitude: Number(row.lon),
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<FarmLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  const row = await fetchJson<{ display_name?: string }>(url, {
    headers: { 'User-Agent': 'AgroCast/1.0 (farm weather mobile app)' },
  });
  return { name: row.display_name ?? 'My farm', latitude, longitude };
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
  const currentYear = new Date().getUTCFullYear();
  const endYear = currentYear - 1;
  const startYear = currentYear - 10;
  const start = `${startYear}0101`;
  const end = `${endYear}1231`;
  const params = new URLSearchParams({
    parameters: 'PRECTOTCORR', community: 'AG', longitude: String(location.longitude),
    latitude: String(location.latitude), start, end, format: 'JSON',
  });
  type Power = { properties: { parameter: { PRECTOTCORR: Record<string, number> } } };
  const raw = await fetchJson<Power>(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`);
  const values = raw.properties.parameter.PRECTOTCORR;
  const totals = new Map<number, number[]>();
  for (let month = 1; month <= 12; month++) totals.set(month, []);
  const yearly = new Map<string, number>();
  Object.entries(values).forEach(([date, value]) => {
    if (value < 0) return;
    const year = date.slice(0, 4);
    const month = Number(date.slice(4, 6));
    const key = `${year}-${month}`;
    yearly.set(key, (yearly.get(key) ?? 0) + value);
  });
  yearly.forEach((total, key) => totals.get(Number(key.split('-')[1]))?.push(total));
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const all = totals.get(month) ?? [];
    const baseline = all.slice(0, Math.max(0, all.length - 1));
    return {
      month,
      normal: baseline.length ? baseline.reduce((a, b) => a + b, 0) / baseline.length : 0,
      recent: (yearly.get(`${currentYear}-${month}`) ?? 0),
    };
  });
  const currentMonthNumber = new Date().getUTCMonth() + 1;
  const currentMonthDays = Object.entries(values).filter(([date]) => date.startsWith(String(currentYear) + String(currentMonthNumber).padStart(2, '0'))).map(([date, value]) => ({ date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`, rainfall: value < 0 ? 0 : value })).sort((a, b) => a.date.localeCompare(b.date));
  const currentYearTotal = months.reduce((sum, month) => sum + month.recent, 0);
  return { months, normalPeriod: `${startYear}–${endYear} average`, recentPeriod: String(currentYear), currentYear, currentYearTotal, currentMonth: { month: currentMonthNumber, total: currentMonthDays.reduce((sum, day) => sum + day.rainfall, 0), days: currentMonthDays } };
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
