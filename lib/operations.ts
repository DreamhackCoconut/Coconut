import { getDemoBatchSnapshot, getDemoDepartures, getSellerById, DEMO_SELLERS } from '@/lib/data/seed';
import type { RouteOptimizationResult, RouteStop } from '@/lib/domain/types';
import { buildDistanceMatrix, naivePickupRoute, optimizePickupRoute, validateRouteOptimizationResult, type PickupVehicle } from '@/lib/engines/routing';
import { calculateWeatherRisk, demoMarineObservations, DEMO_VESSEL_PROFILE } from '@/lib/engines/weather-risk';
import { getRoutingMatrix, getRouteGeometry } from '@/lib/providers/openrouteservice';
import { getMarineForecast } from '@/lib/providers/open-meteo';

export const DEMO_HUB = { latitude: -21.205, longitude: -159.776, label: 'Island consolidation hub' };

export const DEMO_PICKUP_STOPS: RouteStop[] = [
  ['seller-01', 10.4, 0.14, 0],
  ['seller-07', 5.9, 0.09, 1],
  ['seller-03', 8.1, 0.13, 2],
  ['seller-06', 7.6, 0.11, 3],
  ['seller-02', 6.8, 0.1, 4],
  ['seller-05', 4.6, 0.08, 5],
  ['seller-04', 5.2, 0.09, 6],
].map(([sellerId, weightKg, volumeM3, index]) => {
  const seller = getSellerById(String(sellerId)) ?? DEMO_SELLERS[0];
  return { sellerId: seller.id, sellerName: seller.name, latitude: seller.latitude, longitude: seller.longitude, weightKg: Number(weightKg), volumeM3: Number(volumeM3), earliestMinute: 8 * 60 + Number(index) * 10, latestMinute: 16 * 60 };
});

export const DEMO_PICKUP_VEHICLES: PickupVehicle[] = [
  { id: 'van-01', maxWeightKg: 32, maxVolumeM3: 0.55 },
  { id: 'van-02', maxWeightKg: 32, maxVolumeM3: 0.55 },
];

function buildOperationsOverview(baseline: RouteOptimizationResult, optimized: RouteOptimizationResult, weather: ReturnType<typeof calculateWeatherRisk>, providerModes: Record<string, string>) {
  const distanceSaved = Math.max(0, baseline.totalDistanceMeters - optimized.totalDistanceMeters);
  return {
    batch: getDemoBatchSnapshot(),
    departures: getDemoDepartures(),
    stops: DEMO_PICKUP_STOPS,
    baseline,
    optimized,
    savings: { distanceMeters: distanceSaved, percent: baseline.totalDistanceMeters ? (distanceSaved / baseline.totalDistanceMeters) * 100 : 0 },
    weather,
    providerModes,
  };
}

export function getOperationsDemoData() {
  const points = [DEMO_HUB, ...DEMO_PICKUP_STOPS];
  const matrix = buildDistanceMatrix(points);
  const baseline = naivePickupRoute(DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES, matrix);
  const optimized = optimizePickupRoute(DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES, matrix);
  const weather = calculateWeatherRisk(demoMarineObservations(getDemoDepartures()[1].routePoints, getDemoDepartures()[1].weatherRisk), DEMO_VESSEL_PROFILE);
  return buildOperationsOverview(baseline, optimized, weather, { road: 'demo', marine: 'demo', carrier: 'demo', trade: 'demo' });
}

export type OptimizerInvoker = (input: { distanceMatrixMeters: number[][]; durationMatrixSeconds: number[][]; hub: { latitude: number; longitude: number; label: string }; stops: RouteStop[]; vehicles: PickupVehicle[] }) => Promise<RouteOptimizationResult | undefined>;

export async function optimizeOperationsBatch(invokeOptimizer?: OptimizerInvoker) {
  const points = [DEMO_HUB, ...DEMO_PICKUP_STOPS];
  const matrixResult = await getRoutingMatrix(points);
  const baselineMatrix = matrixResult.data.distancesMeters.map((row) => row.map((meters) => meters / 1000));
  const baseline = naivePickupRoute(DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES, baselineMatrix);
  const fallback = optimizePickupRoute(DEMO_HUB, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES, baselineMatrix);
  let optimized = fallback;
  try {
    const remote = await invokeOptimizer?.({ hub: DEMO_HUB, stops: DEMO_PICKUP_STOPS, vehicles: DEMO_PICKUP_VEHICLES, distanceMatrixMeters: matrixResult.data.distancesMeters, durationMatrixSeconds: matrixResult.data.durationsSeconds });
    if (remote) {
      validateRouteOptimizationResult(remote, DEMO_PICKUP_STOPS, DEMO_PICKUP_VEHICLES);
      optimized = remote;
    }
  } catch {
    optimized = fallback;
  }
  const orderedStops = [DEMO_HUB, ...optimized.routes.flatMap((route) => route.stopIndices.map((index) => DEMO_PICKUP_STOPS[index])), DEMO_HUB];
  const geometry = await getRouteGeometry(orderedStops);
  const weatherProvider = await getMarineForecast(getDemoDepartures()[1].routePoints, getDemoDepartures()[1].weatherRisk);
  const weather = calculateWeatherRisk(weatherProvider.data, DEMO_VESSEL_PROFILE);
  const overview = buildOperationsOverview(baseline, optimized, weather, { road: matrixResult.metadata.mode, marine: weatherProvider.metadata.mode, carrier: 'demo', trade: 'demo' });
  return {
    ...overview,
    optimized: { ...optimized, routeGeoJson: { ...optimized.routeGeoJson, geometry: { type: 'LineString', coordinates: geometry.data } } },
  };
}
