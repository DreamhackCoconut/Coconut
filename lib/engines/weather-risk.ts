import { clamp } from '@/lib/config/logistics';
import type { GeoPoint, WeatherObservation, WeatherRisk } from '@/lib/domain/types';

export type VesselProfile = {
  name: string;
  preferredMaxWaveM: number;
  operationalMaxWaveM: number;
  preferredMaxWindKph: number;
  operationalMaxWindKph: number;
  preferredMaxSwellM: number;
  operationalMaxSwellM: number;
};

export const DEMO_VESSEL_PROFILE: VesselProfile = {
  name: 'Island Trader 14',
  preferredMaxWaveM: 1.4,
  operationalMaxWaveM: 2.8,
  preferredMaxWindKph: 28,
  operationalMaxWindKph: 52,
  preferredMaxSwellM: 1.2,
  operationalMaxSwellM: 2.5,
};

export function demoMarineObservations(points: GeoPoint[], weatherRisk = 0.12): WeatherObservation[] {
  return points.map((_point, index) => ({
    waveHeightM: Number((1.05 + weatherRisk * 1.8 + index * 0.06).toFixed(2)),
    wavePeriodS: Number((8.4 + index * 0.4).toFixed(1)),
    swellHeightM: Number((0.7 + weatherRisk * 1.1 + index * 0.04).toFixed(2)),
    swellPeriodS: Number((7.5 + index * 0.3).toFixed(1)),
    windKph: Number((18 + weatherRisk * 24 + index * 1.5).toFixed(1)),
    gustKph: Number((26 + weatherRisk * 30 + index * 1.8).toFixed(1)),
    precipitationMm: Number((1.5 + weatherRisk * 8 + index * 0.2).toFixed(1)),
  }));
}

function thresholdRisk(observed: number, preferred: number, operational: number): number {
  if (observed <= preferred) return clamp(observed / Math.max(0.01, preferred) * 0.35);
  return clamp(0.35 + ((observed - preferred) / Math.max(0.01, operational - preferred)) * 0.65);
}

export function calculateWeatherRisk(observations: WeatherObservation[], vessel: VesselProfile = DEMO_VESSEL_PROFILE): WeatherRisk {
  const pointRisks = observations.map((observation) => {
    const wave = thresholdRisk(observation.waveHeightM, vessel.preferredMaxWaveM, vessel.operationalMaxWaveM);
    const wind = thresholdRisk(observation.windKph, vessel.preferredMaxWindKph, vessel.operationalMaxWindKph);
    const swell = thresholdRisk(observation.swellHeightM, vessel.preferredMaxSwellM, vessel.operationalMaxSwellM);
    const gust = clamp(observation.gustKph / vessel.operationalMaxWindKph);
    const precipitation = clamp(observation.precipitationMm / 25);
    return 0.45 * wave + 0.25 * wind + 0.15 * swell + 0.1 * gust + 0.05 * precipitation;
  });
  const weightedMean = pointRisks.reduce((sum, risk) => sum + risk, 0) / Math.max(1, pointRisks.length);
  const risk = clamp(0.6 * weightedMean + 0.4 * Math.max(...pointRisks, 0));
  const label = risk < 0.3 ? 'LOW' : risk < 0.6 ? 'MODERATE' : risk < 0.8 ? 'HIGH' : 'VERY HIGH';
  return {
    risk: Number(risk.toFixed(3)),
    label,
    explanation: `Route risk combines wave, wind, swell, gust, and precipitation against the ${vessel.name}'s preferred and operational limits.`,
    observations,
  };
}
