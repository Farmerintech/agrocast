export type FarmLocation = {
  name: string;
  latitude: number;
  longitude: number;
  /** Administrative area (state / district / region), from Nominatim when known. */
  region?: string;
  /** Country name, from Nominatim when known. */
  country?: string;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeedMax: number;
  apparentTemperatureMax: number;
  uvIndexMax: number;
  evapotranspiration: number;
};

export type WeatherData = {
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    windSpeed: number;
  };
  daily: WeatherDay[];
  timezone: string;
};

export type RainfallMonth = {
  month: number;
  normal: number;
  recent: number;
};

export type RainfallData = {
  months: RainfallMonth[];
  normalPeriod: string;
  recentPeriod: string;
  currentYear: number;
  currentYearTotal: number;
  /** Typical rainfall accumulated by this same date in prior years — a fair baseline for the "so far" total. */
  normalToDate: number;
  currentMonth: { month: number; total: number; days: { date: string; rainfall: number }[] };
  /** Near-real-time stats from the live forecast model (ERA5 history lags ~5 days). */
  recentRain: {
    yesterday: { date: string; rainfall: number } | null;
    today: { date: string; rainfall: number } | null;
    weekTotal: number | null;
  };
};

export type SoilData = {
  clay: number | null;
  sand: number | null;
  silt: number | null;
  ph: number | null;
  texture: string;
};

export type Loadable<T> = {
  data: T | null;
  updatedAt: string | null;
  isCached: boolean;
};
