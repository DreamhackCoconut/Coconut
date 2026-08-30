import { getExternalDataMode, isDemoMode } from '@/lib/config/env';
import type { ProviderResult } from '@/lib/domain/types';
import { getOrFetch } from '@/lib/server/cache';

const DEMO_INDICATORS = { population: 335000000, gdpPerCapita: 76329, internetUsage: 92 };

export async function getMarketIndicators(countryCode: string): Promise<ProviderResult<typeof DEMO_INDICATORS>> {
  const fallback = (): ProviderResult<typeof DEMO_INDICATORS> => ({ data: DEMO_INDICATORS, metadata: { provider: 'World Bank', mode: 'demo', fetchedAt: new Date().toISOString() } });
  if (getExternalDataMode() === 'demo' || isDemoMode()) return fallback();
  return getOrFetch({ key: `world-bank:${countryCode}`, provider: 'World Bank', ttlMs: 14 * 24 * 60 * 60 * 1000, fetcher: async () => { throw new Error('Live World Bank enrichment is optional for demo reliability.'); }, fallback });
}
