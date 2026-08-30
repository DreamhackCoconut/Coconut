import type { ProviderMode, ProviderResult } from '@/lib/domain/types';

type CacheEntry<T> = { provider: string; payload: T; fetchedAt: string; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): { payload: T; mode: Extract<ProviderMode, 'cache' | 'stale'>; fetchedAt: string } | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  const mode = Date.now() <= entry.expiresAt ? 'cache' : 'stale';
  return { payload: entry.payload, mode, fetchedAt: entry.fetchedAt };
}

export function setCached<T>(key: string, provider: string, payload: T, ttlMs: number): void {
  const fetchedAt = new Date().toISOString();
  cache.set(key, { provider, payload, fetchedAt, expiresAt: Date.now() + ttlMs });
}

export async function getOrFetch<T>(input: {
  key: string;
  provider: string;
  ttlMs: number;
  staleTtlMs?: number;
  fetcher: () => Promise<ProviderResult<T>>;
  fallback: () => ProviderResult<T>;
}): Promise<ProviderResult<T>> {
  const fresh = getCached<T>(input.key);
  if (fresh?.mode === 'cache') return { data: fresh.payload, metadata: { provider: input.provider, mode: 'cache', fetchedAt: fresh.fetchedAt } };
  try {
    const live = await input.fetcher();
    setCached(input.key, input.provider, live.data, input.ttlMs);
    return live;
  } catch {
    if (fresh) return { data: fresh.payload, metadata: { provider: input.provider, mode: 'stale', fetchedAt: fresh.fetchedAt } };
    const fallback = input.fallback();
    setCached(input.key, input.provider, fallback.data, input.staleTtlMs ?? input.ttlMs);
    return fallback;
  }
}

export function clearEphemeralCache(): void {
  cache.clear();
}
