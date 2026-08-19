import { useCallback, useEffect, useState } from 'react';
import { fetchRainfall, fetchSoil, fetchWeather } from './api';
import { getCache, locationCacheKey, setCache } from './db';
import { FarmLocation, Loadable, RainfallData, SoilData, WeatherData } from './types';

const empty = <T,>(): Loadable<T> => ({ data: null, updatedAt: null, isCached: false });

export function useFarmData(location: FarmLocation | null) {
  const [weather, setWeather] = useState<Loadable<WeatherData>>(empty());
  const [rainfall, setRainfall] = useState<Loadable<RainfallData>>(empty());
  const [soil, setSoil] = useState<Loadable<SoilData>>(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOne = useCallback(async <T,>(
    prefix: string,
    fetcher: (l: FarmLocation) => Promise<T>,
    setter: (value: Loadable<T>) => void,
  ) => {
    if (!location) return;
    const key = locationCacheKey(prefix, location);
    try {
      const data = await fetcher(location);
      const updatedAt = await setCache(key, data);
      setter({ data, updatedAt, isCached: false });
      return true;
    } catch {
      const cached = await getCache<T>(key);
      if (cached) setter({ data: cached.data, updatedAt: cached.updatedAt, isCached: true });
      return false;
    }
  }, [location]);

  const refresh = useCallback(async () => {
    if (!location) return;
    setLoading(true); setError(null);
    const results = await Promise.all([
      loadOne('weather', fetchWeather, setWeather),
      loadOne('rainfall', fetchRainfall, setRainfall),
      loadOne('soil', fetchSoil, setSoil),
    ]);
    if (!results[0] && !weather.data) setError('Could not load weather. Check your connection and try again.');
    setLoading(false);
  }, [loadOne, location, weather.data]);

  useEffect(() => { void refresh(); }, [location?.latitude, location?.longitude]);
  return { weather, rainfall, soil, loading, error, refresh };
}
