export type RoutingPoint = { latitude: number; longitude: number };

export type RoutingMatrix = {
  distancesMeters: number[][];
  durationsSeconds: number[][];
};
