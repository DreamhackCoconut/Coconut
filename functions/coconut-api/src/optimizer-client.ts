import { Functions } from 'node-appwrite';
import type { GeoPoint, RouteOptimizationResult, RouteStop } from '@/lib/domain/types';
import { createAppwriteServerClient } from '@/lib/repositories/appwrite';
import type { PickupVehicle } from '@/lib/engines/routing';

export async function invokeOrToolsOptimizer(input: { distanceMatrixMeters: number[][]; durationMatrixSeconds: number[][]; hub: GeoPoint; stops: RouteStop[]; vehicles: PickupVehicle[] }): Promise<RouteOptimizationResult | undefined> {
  const functionId = process.env.APPWRITE_OPTIMIZER_FUNCTION_ID;
  const appwrite = createAppwriteServerClient();
  if (!functionId || !appwrite) return undefined;
  try {
    const functions = new Functions(appwrite.client);
    const execution = await functions.createExecution({
      functionId,
      body: JSON.stringify({ ...input, timeLimitSeconds: 3 }),
      async: false,
    });
    const responseBody = (execution as { responseBody?: string }).responseBody;
    if (!responseBody) return undefined;
    const payload = JSON.parse(responseBody) as Partial<RouteOptimizationResult>;
    if (payload.optimizerMode !== 'ortools' || !Array.isArray(payload.routes) || payload.routes.length === 0) return undefined;
    return payload as RouteOptimizationResult;
  } catch {
    return undefined;
  }
}
