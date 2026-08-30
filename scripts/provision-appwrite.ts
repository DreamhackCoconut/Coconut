import tables from '@/appwrite/tables.json';
import { createAppwriteServerClient } from '@/lib/repositories/appwrite';

type ColumnSpec = {
  key: string;
  type: string;
  size?: number;
  required?: boolean;
  elements?: string[];
};

type TableSpec = {
  $id: string;
  name: string;
  $permissions?: string[];
  rowSecurity?: boolean;
  columns: ColumnSpec[];
};

async function main() {
  const appwrite = createAppwriteServerClient();
  if (!appwrite) {
    console.error('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID before provisioning.');
    process.exitCode = 1;
    return;
  }

  // The manifest is the reviewable source of truth; this script is the repeatable
  // configuration-first bridge for a fresh Appwrite Cloud project.
  const api = appwrite.tablesDB as unknown as Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
  for (const table of tables as TableSpec[]) {
    try {
      await api.getTable({ databaseId: appwrite.databaseId, tableId: table.$id });
      console.log(`Table exists: ${table.$id}`);
    } catch {
      await api.createTable({
        databaseId: appwrite.databaseId,
        tableId: table.$id,
        name: table.name,
        permissions: table.$permissions ?? [],
        rowSecurity: table.rowSecurity ?? false,
        columns: table.columns,
      });
      console.log(`Created table: ${table.$id}`);
    }
  }
  console.log(`Provisioned ${tables.length} Coconut TablesDB tables. Run npm run appwrite:seed next.`);
}

main().catch((error) => {
  console.error('Appwrite provisioning failed:', error);
  process.exitCode = 1;
});
