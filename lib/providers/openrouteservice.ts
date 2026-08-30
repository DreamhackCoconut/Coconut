import { LOGISTICS } from '@/lib/config/logistics';
import { shouldUseLiveProvider } from '@/lib/config/env';
import type { GeoPoint, ProviderResult } from '@/lib/domain/types';
import { buildDistanceMatrix, haversineKm } from '@/lib/engines/routing';
import type { RoutingMatrix } from '@/lib/providers/types';
import { getOrFetch } from '@/lib/server/cache';

function cacheKey(points: GeoPoint[], profile: string): string {
  return `ors-matrix:${profile}:${points.map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`).sort().join('|')}`;
}

function fallbackMatrix(points: GeoPoint[]): ProviderResult<RoutingMatrix> {
  const distances = buildDistanceMatrix(points).map((row) => row.map((km) => Math.round(km * 1000)));
  return {
    data: { distancesMeters: distances, durationsSeconds: distances.map((row) => row.map((meters) => Math.round((meters / LOGISTICS.demoAverageRoadSpeedKph) * 3.6))) },
    metadata: { provider: 'OpenRouteService', mode: 'demo', fetchedAt: new Date().toISOString() },
  };
}

export async function getRoutingMatrix(points: GeoPoint[], profile = 'driving-car'): Promise<ProviderResult<RoutingMatrix>> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  const fallback = () => fallbackMatrix(points);
  if (!shouldUseLiveProvider(key)) return fallback();
  return getOrFetch({
    key: cacheKey(points, profile),
    provider: 'OpenRouteService',
    ttlMs: 24 * 60 * 60 * 1000,
    fetcher: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(`https://api.openrouteservice.org/v2/matrix/${profile}`, { method: 'POST', headers: { Authorization: key as string, 'Content-Type': 'application/json' }, body: JSON.stringify({ locations: points.map((point) => [point.longitude, point.latitude]), metrics: ['distance', 'duration'] }), signal: controller.signal });
        if (!response.ok) throw new Error(`ORS matrix returned ${response.status}`);
        const payload = await response.json() as { distances?: number[][]; durations?: number[][] };
        if (!payload.distances || !payload.durations) throw new Error('ORS matrix response was incomplete');
        return { data: { distancesMeters: payload.distances, durationsSeconds: payload.durations }, metadata: { provider: 'OpenRouteService', mode: 'live', fetchedAt: new Date().toISOString() } };
      } finally {
        clearTimeout(timeout);
      }
    },
    fallback,
  });
}

export async function getRouteGeometry(points: GeoPoint[]): Promise<ProviderResult<[number, number][]>> {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!shouldUseLiveProvider(key)) return { data: points.map((point) => [point.longitude, point.latitude]), metadata: { provider: 'OpenRouteService', mode: 'demo', fetchedAt: new Date().toISOString() } };
  return getOrFetch({
    key: `ors-route:${points.map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`).join('|')}`,
    provider: 'OpenRouteService',
    ttlMs: 24 * 60 * 60 * 1000,
    fetcher: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', { method: 'POST', headers: { Authorization: key as string, 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: points.map((point) => [point.longitude, point.latitude]) }), signal: controller.signal });
        if (!response.ok) throw new Error(`ORS route returned ${response.status}`);
        const payload = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number][] } }> };
        const coordinates = payload.features?.[0]?.geometry?.coordinates;
        if (!coordinates?.length) throw new Error('ORS route response was incomplete');
        return { data: coordinates, metadata: { provider: 'OpenRouteService', mode: 'live', fetchedAt: new Date().toISOString() } };
      } finally {
        clearTimeout(timeout);
      }
    },
    fallback: () => ({ data: points.map((point) => [point.longitude, point.latitude]), metadata: { provider: 'OpenRouteService', mode: 'demo', fetchedAt: new Date().toISOString() } }),
  });
}

export function estimateRoadDistanceKm(a: GeoPoint, b: GeoPoint): number {
  return haversineKm(a, b) * LOGISTICS.roadFactor;
}
