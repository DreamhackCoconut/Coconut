import { DemoMarketplaceRepository } from '@/lib/repositories/demo';
import { AppwriteMarketplaceRepository, createAppwriteServerClient } from '@/lib/repositories/appwrite';
import type { MarketplaceRepository } from '@/lib/repositories/types';

let demoRepository: DemoMarketplaceRepository | undefined;

export function getMarketplaceRepository(): MarketplaceRepository {
  const appwrite = createAppwriteServerClient();
  if (appwrite) return new AppwriteMarketplaceRepository(appwrite.tablesDB, appwrite.databaseId);
  demoRepository ??= new DemoMarketplaceRepository();
  return demoRepository;
}

export { AppwriteMarketplaceRepository, DemoMarketplaceRepository };
export type { MarketplaceRepository } from '@/lib/repositories/types';
