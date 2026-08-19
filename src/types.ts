export type FarmLocation = {
  name: string;
  latitude: number;
  longitude: number;
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
  currentMonth: { month: number; total: number; days: { date: string; rainfall: number }[] };
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
