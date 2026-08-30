import { Query, TablesDB } from 'node-appwrite';
import type { ProviderMode, ProviderResult } from '@/lib/domain/types';

type CacheRow = {
  $id?: string;
  cache_key?: string;
  provider?: string;
  payload_json?: string;
  fetched_at?: string;
  expires_at?: string;
  stale_until?: string;
};

type PersistentCacheHit<T> = {
  payload: T;
  mode: Extract<ProviderMode, 'cache' | 'stale'>;
  fetchedAt: string;
};

export class AppwriteCacheStore {
  constructor(private readonly tablesDB: TablesDB, private readonly databaseId: string) {}

  private async find(tableId: string, key: string): Promise<CacheRow | undefined> {
    const result = await this.tablesDB.listRows({ databaseId: this.databaseId, tableId, queries: [Query.equal('cache_key', key), Query.limit(1)] });
    const payload = result as { rows?: CacheRow[]; documents?: CacheRow[] };
    return payload.rows?.[0] ?? payload.documents?.[0];
  }

  async read<T>(tableId: string, key: string): Promise<PersistentCacheHit<T> | undefined> {
    try {
      const row = await this.find(tableId, key);
      if (!row?.payload_json || !row.fetched_at || !row.expires_at) return undefined;
      const payload = JSON.parse(row.payload_json) as T;
      const now = Date.now();
      const expiresAt = new Date(row.expires_at).getTime();
      const staleUntil = new Date(row.stale_until ?? row.expires_at).getTime();
      if (now <= expiresAt) return { payload, mode: 'cache', fetchedAt: row.fetched_at };
      if (now <= staleUntil) return { payload, mode: 'stale', fetchedAt: row.fetched_at };
      return undefined;
    } catch {
      return undefined;
    }
  }

  async write<T>(tableId: string, key: string, provider: string, payload: T, ttlMs: number, staleTtlMs = ttlMs * 7): Promise<void> {
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + ttlMs);
    const staleUntil = new Date(fetchedAt.getTime() + staleTtlMs);
    const data = { cache_key: key, provider, payload_json: JSON.stringify(payload), fetched_at: fetchedAt.toISOString(), expires_at: expiresAt.toISOString(), stale_until: staleUntil.toISOString() };
    try {
      const existing = await this.find(tableId, key);
      if (existing?.$id) {
        await this.tablesDB.updateRow({ databaseId: this.databaseId, tableId, rowId: existing.$id, data });
      } else {
        // A cache key is intentionally readable and deterministic; row IDs are opaque Appwrite IDs.
        const { ID } = await import('node-appwrite');
        await this.tablesDB.createRow({ databaseId: this.databaseId, tableId, rowId: ID.unique(), data });
      }
    } catch {
      // Persistent caching is an optimization. Provider fallbacks remain authoritative if it is unavailable.
    }
  }
}

export async function getPersistentProviderResult<T>(input: {
  store?: AppwriteCacheStore;
  tableId: string;
  key: string;
  provider: string;
  ttlMs: number;
  staleTtlMs?: number;
  fetcher: () => Promise<ProviderResult<T>>;
  fallback: () => ProviderResult<T>;
}): Promise<ProviderResult<T>> {
  if (!input.store) return input.fetcher().catch(() => input.fallback());
  const cached = await input.store.read<T>(input.tableId, input.key);
  if (cached?.mode === 'cache') return { data: cached.payload, metadata: { provider: input.provider, mode: 'cache', fetchedAt: cached.fetchedAt } };
  try {
    const result = await input.fetcher();
    await input.store.write(input.tableId, input.key, input.provider, result.data, input.ttlMs, input.staleTtlMs);
    return result;
  } catch {
    if (cached) return { data: cached.payload, metadata: { provider: input.provider, mode: 'stale', fetchedAt: cached.fetchedAt } };
    const result = input.fallback();
    await input.store.write(input.tableId, input.key, input.provider, result.data, input.ttlMs, input.staleTtlMs);
    return result;
  }
}
