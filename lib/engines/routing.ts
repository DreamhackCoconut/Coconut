import { LOGISTICS } from '@/lib/config/logistics';
import type { GeoPoint, Route, RouteGeoJson, RouteOptimizationResult, RouteStop } from '@/lib/domain/types';

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildDistanceMatrix(points: GeoPoint[]): number[][] {
  return points.map((from) => points.map((to) => from === to ? 0 : haversineKm(from, to) * LOGISTICS.roadFactor));
}

export type PickupVehicle = { id: string; maxWeightKg: number; maxVolumeM3: number };

function routeDistance(route: number[], matrix: number[][]): number {
  let distance = 0;
  let previous = 0;
  for (const stop of route) {
    distance += matrix[previous][stop];
    previous = stop;
  }
  return distance + matrix[previous][0];
}

function buildRouteGeoJson(hub: GeoPoint, stops: RouteStop[], routes: Route[]): RouteGeoJson {
  const coordinates: [number, number][] = [];
  for (const route of routes) {
    coordinates.push([hub.longitude, hub.latitude]);
    for (const index of route.stopIndices) coordinates.push([stops[index].longitude, stops[index].latitude]);
    coordinates.push([hub.longitude, hub.latitude]);
  }
  return { type: 'Feature', properties: { mode: 'typescript-fallback' }, geometry: { type: 'LineString', coordinates } };
}

export function naivePickupRoute(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix = buildDistanceMatrix([hub, ...stops])): RouteOptimizationResult {
  const routes: Route[] = [];
  let stopCursor = 0;
  for (const vehicle of vehicles) {
    if (stopCursor >= stops.length) break;
    const stopIndices: number[] = [];
    let loadWeightKg = 0;
    let loadVolumeM3 = 0;
    while (stopCursor < stops.length && loadWeightKg + stops[stopCursor].weightKg <= vehicle.maxWeightKg && loadVolumeM3 + stops[stopCursor].volumeM3 <= vehicle.maxVolumeM3) {
      stopIndices.push(stopCursor);
      loadWeightKg += stops[stopCursor].weightKg;
      loadVolumeM3 += stops[stopCursor].volumeM3;
      stopCursor += 1;
    }
    routes.push({ vehicleId: vehicle.id, stopIndices, sellerIds: stopIndices.map((index) => stops[index].sellerId), distanceMeters: routeDistance(stopIndices.map((index) => index + 1), matrix) * 1000, durationSeconds: routeDistance(stopIndices.map((index) => index + 1), matrix) / LOGISTICS.demoAverageRoadSpeedKph * 3600, loadWeightKg, loadVolumeM3 });
  }
  const totalDistanceMeters = routes.reduce((sum, route) => sum + route.distanceMeters, 0);
  const totalDurationSeconds = routes.reduce((sum, route) => sum + route.durationSeconds, 0);
  return { routes, totalDistanceMeters, totalDurationSeconds, objectiveValue: totalDistanceMeters, optimizerMode: 'typescript-fallback', routeGeoJson: buildRouteGeoJson(hub, stops, routes) };
}

export function optimizePickupRoute(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix = buildDistanceMatrix([hub, ...stops])): RouteOptimizationResult {
  const unvisited = new Set(stops.map((_stop, index) => index));
  const routes: Route[] = [];
  for (const vehicle of vehicles) {
    if (!unvisited.size) break;
    const stopIndices: number[] = [];
    let currentMatrixIndex = 0;
    let loadWeightKg = 0;
    let loadVolumeM3 = 0;
    while (unvisited.size) {
      const feasible = [...unvisited].filter((index) => loadWeightKg + stops[index].weightKg <= vehicle.maxWeightKg && loadVolumeM3 + stops[index].volumeM3 <= vehicle.maxVolumeM3);
      if (!feasible.length) break;
      const next = feasible.sort((a, b) => matrix[currentMatrixIndex][a + 1] - matrix[currentMatrixIndex][b + 1])[0];
      stopIndices.push(next);
      unvisited.delete(next);
      currentMatrixIndex = next + 1;
      loadWeightKg += stops[next].weightKg;
      loadVolumeM3 += stops[next].volumeM3;
    }
    routes.push({ vehicleId: vehicle.id, stopIndices, sellerIds: stopIndices.map((index) => stops[index].sellerId), distanceMeters: routeDistance(stopIndices.map((index) => index + 1), matrix) * 1000, durationSeconds: routeDistance(stopIndices.map((index) => index + 1), matrix) / LOGISTICS.demoAverageRoadSpeedKph * 3600, loadWeightKg, loadVolumeM3 });
  }
  if (unvisited.size) throw new Error('Pickup stops exceed the provided vehicle capacity.');
  const totalDistanceMeters = routes.reduce((sum, route) => sum + route.distanceMeters, 0);
  const totalDurationSeconds = routes.reduce((sum, route) => sum + route.durationSeconds, 0);
  return { routes, totalDistanceMeters, totalDurationSeconds, objectiveValue: totalDistanceMeters, optimizerMode: 'typescript-fallback', routeGeoJson: buildRouteGeoJson(hub, stops, routes) };
}
