import { DemoMarketplaceRepository } from '@/lib/repositories/demo';
import { AppwriteMarketplaceRepository, createAppwriteServerClient } from '@/lib/repositories/appwrite';
import type { MarketplaceRepository } from '@/lib/repositories/types';

let demoRepository: DemoMarketplaceRepository | undefined;
let appwriteRepository: AppwriteMarketplaceRepository | undefined;
let appwriteRepositoryTables: object | undefined;

export function getMarketplaceRepository(): MarketplaceRepository {
  const appwrite = createAppwriteServerClient();
  if (appwrite) {
    if (!appwriteRepository || appwriteRepositoryTables !== appwrite.tablesDB) {
      appwriteRepository = new AppwriteMarketplaceRepository(appwrite.tablesDB, appwrite.databaseId);
      appwriteRepositoryTables = appwrite.tablesDB;
    }
    return appwriteRepository;
  }
  appwriteRepository = undefined;
  appwriteRepositoryTables = undefined;
  demoRepository ??= new DemoMarketplaceRepository();
  return demoRepository;
}

export { AppwriteMarketplaceRepository, DemoMarketplaceRepository };
export type { MarketplaceRepository } from '@/lib/repositories/types';
