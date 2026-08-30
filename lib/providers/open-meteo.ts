import { getExternalDataMode, isDemoMode } from '@/lib/config/env';
import type { GeoPoint, ProviderResult, WeatherObservation } from '@/lib/domain/types';
import { demoMarineObservations } from '@/lib/engines/weather-risk';
import { getOrFetch } from '@/lib/server/cache';

function demoResult(points: GeoPoint[], weatherRisk = 0.12): ProviderResult<WeatherObservation[]> {
  return { data: demoMarineObservations(points, weatherRisk), metadata: { provider: 'Open-Meteo Marine', mode: 'demo', fetchedAt: new Date().toISOString() } };
}

export async function getMarineForecast(points: GeoPoint[], weatherRisk = 0.12): Promise<ProviderResult<WeatherObservation[]>> {
  if (getExternalDataMode() === 'demo' || isDemoMode()) return demoResult(points, weatherRisk);
  const latitude = points.map((point) => point.latitude.toFixed(3)).join(',');
  const longitude = points.map((point) => point.longitude.toFixed(3)).join(',');
  return getOrFetch({
    key: `open-meteo-marine:${latitude}:${longitude}`,
    provider: 'Open-Meteo Marine',
    ttlMs: 60 * 60 * 1000,
    fetcher: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_period,swell_wave_height,swell_wave_period&forecast_days=2`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
        const payload = await response.json() as { hourly?: Record<string, number[] | undefined> };
        const hourly = payload.hourly;
        if (!hourly?.wave_height?.length) throw new Error('Open-Meteo payload was incomplete');
        const valueAt = (values: number[] | undefined, index: number, fallback: number) => {
          const value = Number(values?.[index] ?? fallback);
          return Number.isFinite(value) && value >= 0 ? value : fallback;
        };
        const observations = points.map((_point, index) => ({ waveHeightM: valueAt(hourly.wave_height, index, 1), wavePeriodS: valueAt(hourly.wave_period, index, 8), swellHeightM: valueAt(hourly.swell_wave_height, index, 0.7), swellPeriodS: valueAt(hourly.swell_wave_period, index, 7), windKph: 20, gustKph: 28, precipitationMm: 2 }));
        return { data: observations, metadata: { provider: 'Open-Meteo Marine', mode: 'live', fetchedAt: new Date().toISOString() } };
      } finally {
        clearTimeout(timeout);
      }
    },
    fallback: () => demoResult(points, weatherRisk),
  });
}
