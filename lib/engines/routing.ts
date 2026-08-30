import { LOGISTICS } from '@/lib/config/logistics';
import type { GeoPoint, Route, RouteGeoJson, RouteOptimizationResult, RouteStop } from '@/lib/domain/types';

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function validatePoint(point: GeoPoint, label: string): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 || !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new Error(`${label} has invalid coordinates.`);
  }
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  validatePoint(a, 'Origin');
  validatePoint(b, 'Destination');
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildDistanceMatrix(points: GeoPoint[]): number[][] {
  points.forEach((point, index) => validatePoint(point, `Point ${index}`));
  return points.map((from, fromIndex) => points.map((to, toIndex) => fromIndex === toIndex ? 0 : haversineKm(from, to) * LOGISTICS.roadFactor));
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

function validateRoutingInputs(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix: number[][]): void {
  validatePoint(hub, 'Hub');
  if (stops.length > LOGISTICS.maxOptimizationStops) throw new Error(`Pickup routes support at most ${LOGISTICS.maxOptimizationStops} stops.`);
  if (!vehicles.length || vehicles.length > LOGISTICS.maxOptimizationVehicles) throw new Error(`Pickup routes require between 1 and ${LOGISTICS.maxOptimizationVehicles} vehicles.`);
  const expectedSize = stops.length + 1;
  if (matrix.length !== expectedSize || matrix.some((row) => row.length !== expectedSize)) throw new Error('Distance matrix must include the hub and every pickup stop.');
  for (const [index, stop] of stops.entries()) {
    validatePoint(stop, `Pickup stop ${index + 1}`);
    if (![stop.weightKg, stop.volumeM3, stop.earliestMinute, stop.latestMinute].every(Number.isFinite) || stop.weightKg < 0 || stop.volumeM3 < 0 || stop.earliestMinute < 0 || stop.latestMinute < stop.earliestMinute) {
      throw new Error(`Pickup stop ${index + 1} has invalid capacity or time-window values.`);
    }
  }
  for (const vehicle of vehicles) {
    if (!vehicle.id || !Number.isFinite(vehicle.maxWeightKg) || vehicle.maxWeightKg <= 0 || !Number.isFinite(vehicle.maxVolumeM3) || vehicle.maxVolumeM3 <= 0) throw new Error(`Vehicle ${vehicle.id || 'unknown'} has invalid capacity.`);
  }
  for (const row of matrix) {
    if (row.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Distance matrix contains an invalid value.');
  }
}

function respectsTimeWindows(stopIndices: number[], stops: RouteStop[], matrix: number[][]): boolean {
  let minute = 8 * 60;
  let previousMatrixIndex = 0;
  for (const stopIndex of stopIndices) {
    minute += (matrix[previousMatrixIndex][stopIndex + 1] / LOGISTICS.demoAverageRoadSpeedKph) * 60;
    minute = Math.max(minute, stops[stopIndex].earliestMinute);
    if (minute > stops[stopIndex].latestMinute) return false;
    minute += 20;
    previousMatrixIndex = stopIndex + 1;
  }
  return true;
}

function buildValidatedMatrix(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix?: number[][]): number[][] {
  const routingMatrix = matrix ?? buildDistanceMatrix([hub, ...stops]);
  validateRoutingInputs(hub, stops, vehicles, routingMatrix);
  return routingMatrix;
}

export function naivePickupRoute(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix?: number[][]): RouteOptimizationResult {
  const routingMatrix = buildValidatedMatrix(hub, stops, vehicles, matrix);
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
    if (stopIndices.length && !respectsTimeWindows(stopIndices, stops, routingMatrix)) throw new Error('Pickup stops cannot be completed within their time windows.');
    const distanceKm = routeDistance(stopIndices.map((index) => index + 1), routingMatrix);
    routes.push({ vehicleId: vehicle.id, stopIndices, sellerIds: stopIndices.map((index) => stops[index].sellerId), distanceMeters: distanceKm * 1000, durationSeconds: distanceKm / LOGISTICS.demoAverageRoadSpeedKph * 3600, loadWeightKg, loadVolumeM3 });
  }
  if (stopCursor < stops.length) throw new Error('Pickup stops exceed the provided vehicle capacity.');
  const totalDistanceMeters = routes.reduce((sum, route) => sum + route.distanceMeters, 0);
  const totalDurationSeconds = routes.reduce((sum, route) => sum + route.durationSeconds, 0);
  return { routes, totalDistanceMeters, totalDurationSeconds, objectiveValue: totalDistanceMeters, optimizerMode: 'typescript-fallback', routeGeoJson: buildRouteGeoJson(hub, stops, routes) };
}

export function optimizePickupRoute(hub: GeoPoint, stops: RouteStop[], vehicles: PickupVehicle[], matrix?: number[][]): RouteOptimizationResult {
  const routingMatrix = buildValidatedMatrix(hub, stops, vehicles, matrix);
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
      const next = feasible.sort((a, b) => routingMatrix[currentMatrixIndex][a + 1] - routingMatrix[currentMatrixIndex][b + 1])[0];
      stopIndices.push(next);
      unvisited.delete(next);
      currentMatrixIndex = next + 1;
      loadWeightKg += stops[next].weightKg;
      loadVolumeM3 += stops[next].volumeM3;
    }
    if (stopIndices.length && !respectsTimeWindows(stopIndices, stops, routingMatrix)) throw new Error('Pickup stops cannot be completed within their time windows.');
    const distanceKm = routeDistance(stopIndices.map((index) => index + 1), routingMatrix);
    routes.push({ vehicleId: vehicle.id, stopIndices, sellerIds: stopIndices.map((index) => stops[index].sellerId), distanceMeters: distanceKm * 1000, durationSeconds: distanceKm / LOGISTICS.demoAverageRoadSpeedKph * 3600, loadWeightKg, loadVolumeM3 });
  }
  if (unvisited.size) throw new Error('Pickup stops exceed the provided vehicle capacity.');
  const totalDistanceMeters = routes.reduce((sum, route) => sum + route.distanceMeters, 0);
  const totalDurationSeconds = routes.reduce((sum, route) => sum + route.durationSeconds, 0);
  return { routes, totalDistanceMeters, totalDurationSeconds, objectiveValue: totalDistanceMeters, optimizerMode: 'typescript-fallback', routeGeoJson: buildRouteGeoJson(hub, stops, routes) };
}

export function validateRouteOptimizationResult(result: RouteOptimizationResult, stops: RouteStop[], vehicles: PickupVehicle[]): void {
  if (!result || !Array.isArray(result.routes) || !Number.isFinite(result.totalDistanceMeters) || result.totalDistanceMeters < 0 || !Number.isFinite(result.totalDurationSeconds) || result.totalDurationSeconds < 0) throw new Error('Optimizer returned an invalid route result.');
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const visited = new Set<number>();
  const usedVehicles = new Set<string>();
  for (const route of result.routes) {
    const vehicle = vehicleById.get(route.vehicleId);
    if (!vehicle || usedVehicles.has(route.vehicleId) || !Array.isArray(route.stopIndices) || !Array.isArray(route.sellerIds) || route.sellerIds.length !== route.stopIndices.length || route.stopIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= stops.length || visited.has(index))) throw new Error('Optimizer returned an invalid or duplicate pickup stop.');
    const loadWeightKg = route.stopIndices.reduce((sum, index) => sum + stops[index].weightKg, 0);
    const loadVolumeM3 = route.stopIndices.reduce((sum, index) => sum + stops[index].volumeM3, 0);
    if (route.stopIndices.some((index, stopPosition) => route.sellerIds[stopPosition] !== stops[index].sellerId) || loadWeightKg > vehicle.maxWeightKg + 1e-6 || loadVolumeM3 > vehicle.maxVolumeM3 + 1e-9 || Math.abs(loadWeightKg - route.loadWeightKg) > 1e-3 || Math.abs(loadVolumeM3 - route.loadVolumeM3) > 1e-6 || !Number.isFinite(route.distanceMeters) || route.distanceMeters < 0 || !Number.isFinite(route.durationSeconds) || route.durationSeconds < 0) throw new Error('Optimizer returned a route that violates capacity or numeric constraints.');
    usedVehicles.add(route.vehicleId);
    route.stopIndices.forEach((index) => visited.add(index));
  }
  if (visited.size !== stops.length) throw new Error('Optimizer returned an incomplete pickup assignment.');
}
