import { shouldUseLiveProvider } from '@/lib/config/env';
import type { ProviderResult } from '@/lib/domain/types';
import { getOrFetch } from '@/lib/server/cache';

const DEMO_TRADE_DEMAND: Record<string, number> = { basketry: 0.92, 'wood crafts': 0.82, 'textile crafts': 0.79, ceramics: 0.73, jewelry: 0.86 };

export async function getTradeDemandSignals(category = 'basketry'): Promise<ProviderResult<{ category: string; hsChapter: string; score: number; description: string }>> {
  const normalized = category.toLowerCase();
  const hsChapter = normalized.includes('basket') ? '46' : normalized.includes('wood') ? '44' : normalized.includes('textile') ? '63' : normalized.includes('ceramic') ? '69' : '71';
  const fallback = (): ProviderResult<{ category: string; hsChapter: string; score: number; description: string }> => ({ data: { category, hsChapter, score: DEMO_TRADE_DEMAND[normalized] ?? 0.7, description: 'International trade-category demand signal; not exact retail demand.' }, metadata: { provider: 'UN Comtrade', mode: 'demo', fetchedAt: new Date().toISOString() } });
  if (!shouldUseLiveProvider(process.env.COMTRADE_API_KEY)) return fallback();
  return getOrFetch({ key: `comtrade:${normalized}`, provider: 'UN Comtrade', ttlMs: 7 * 24 * 60 * 60 * 1000, fetcher: async () => { throw new Error('Live Comtrade adapter is opt-in for the demo.'); }, fallback });
}
