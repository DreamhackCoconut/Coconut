import type { ProviderResult } from '@/lib/domain/types';
import { DEMO_PORTS } from '@/lib/data/seed';

export async function getWorldPortIndexBootstrap(): Promise<ProviderResult<typeof DEMO_PORTS>> {
  return { data: DEMO_PORTS, metadata: { provider: 'NGA World Port Index', mode: 'demo', fetchedAt: new Date().toISOString() } };
}
