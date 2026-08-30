import { getExternalDataMode, isDemoMode } from '@/lib/config/env';
import type { ProviderResult } from '@/lib/domain/types';
import { getOrFetch } from '@/lib/server/cache';

const DEMO_RATES: Record<string, number> = { USD: 1, AUD: 1.52, NZD: 1.68, JPY: 147.2, CAD: 1.38 };

export async function getExchangeRates(): Promise<ProviderResult<Record<string, number>>> {
  if (getExternalDataMode() === 'demo' || isDemoMode()) return { data: DEMO_RATES, metadata: { provider: 'Frankfurter', mode: 'demo', fetchedAt: new Date().toISOString() } };
  return getOrFetch({
    key: 'frankfurter:usd', provider: 'Frankfurter', ttlMs: 24 * 60 * 60 * 1000,
    fetcher: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD', { signal: controller.signal });
        if (!response.ok) throw new Error(`Frankfurter returned ${response.status}`);
        const payload = await response.json() as { rates?: Record<string, number> };
        if (!payload.rates) throw new Error('Frankfurter payload was incomplete');
        return { data: { USD: 1, ...payload.rates }, metadata: { provider: 'Frankfurter', mode: 'live', fetchedAt: new Date().toISOString() } };
      } finally { clearTimeout(timeout); }
    }, fallback: () => ({ data: DEMO_RATES, metadata: { provider: 'Frankfurter', mode: 'demo', fetchedAt: new Date().toISOString() } }),
  });
}
