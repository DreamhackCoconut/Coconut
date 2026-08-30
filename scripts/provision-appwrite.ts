import tables from '@/appwrite/tables.json';
import { createAppwriteServerClient } from '@/lib/repositories/appwrite';

type ColumnSpec = {
  key: string;
  type: string;
  size?: number;
  required?: boolean;
  elements?: string[];
  default?: unknown;
  array?: boolean;
  encrypt?: boolean;
  min?: number;
  max?: number;
};

type IndexSpec = {
  key: string;
  type: string;
  columns: string[];
  orders?: string[];
  lengths?: number[];
};

type TableSpec = {
  $id: string;
  name: string;
  $permissions?: string[];
  enabled?: boolean;
  rowSecurity?: boolean;
  columns: ColumnSpec[];
  indexes?: IndexSpec[];
};

type AppwriteResource = {
  key?: unknown;
  type?: unknown;
  status?: unknown;
  required?: unknown;
  array?: unknown;
  size?: unknown;
  elements?: unknown;
  columns?: unknown;
};

type AppwriteApi = Record<string, (args: Record<string, unknown>) => Promise<unknown>>;

const WAIT_BETWEEN_SCHEMA_POLLS_MS = 750;
const MAX_SCHEMA_POLLS = 20;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const record = asRecord(error);
  return typeof record.message === 'string' ? record.message : String(error);
}

function errorCode(error: unknown): number | undefined {
  const code = asRecord(error).code;
  return typeof code === 'number' ? code : undefined;
}

function isMissingResource(error: unknown): boolean {
  return errorCode(error) === 404 || /not found|does not exist/i.test(errorMessage(error));
}

function isAlreadyCreated(error: unknown): boolean {
  return errorCode(error) === 409 || /already exists|duplicate|unique constraint/i.test(errorMessage(error));
}

function asList(value: unknown, key: string): AppwriteResource[] {
  const list = asRecord(value)[key];
  return Array.isArray(list) ? list.filter((item): item is AppwriteResource => Boolean(item && typeof item === 'object')) : [];
}

function normalizedType(type: unknown): string {
  const value = String(type ?? '').toLowerCase();
  if (value === 'string') return 'varchar';
  if (value === 'double') return 'float';
  return value;
}

function valuesMatch(left: unknown, right: unknown): boolean {
  if (!Array.isArray(left) || !Array.isArray(right)) return left === right;
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function optionalDefault(spec: ColumnSpec, args: Record<string, unknown>) {
  if (spec.default !== undefined && spec.required !== true) args.xdefault = spec.default;
  if (spec.array !== undefined) args.array = spec.array;
  if (spec.encrypt !== undefined) args.encrypt = spec.encrypt;
}

async function ensureDatabase(api: AppwriteApi, databaseId: string) {
  try {
    await api.get({ databaseId });
    console.log(`Database exists: ${databaseId}`);
  } catch (error) {
    if (!isMissingResource(error)) throw error;
    try {
      await api.create({ databaseId, name: 'Coconut', enabled: true, specification: 'serverless' });
      console.log(`Created database: ${databaseId}`);
    } catch (createError) {
      if (!isAlreadyCreated(createError)) throw createError;
      await api.get({ databaseId });
      console.log(`Database became available during provisioning: ${databaseId}`);
    }
  }
}

async function createColumn(api: AppwriteApi, databaseId: string, tableId: string, spec: ColumnSpec) {
  const args: Record<string, unknown> = {
    databaseId,
    tableId,
    key: spec.key,
    required: spec.required ?? false,
  };
  optionalDefault(spec, args);

  switch (spec.type) {
    case 'varchar':
    case 'string':
      args.size = spec.size ?? 255;
      await api.createVarcharColumn(args);
      return;
    case 'text':
      await api.createTextColumn(args);
      return;
    case 'mediumtext':
      await api.createMediumtextColumn(args);
      return;
    case 'longtext':
      await api.createLongtextColumn(args);
      return;
    case 'integer':
      if (spec.min !== undefined) args.min = spec.min;
      if (spec.max !== undefined) args.max = spec.max;
      await api.createIntegerColumn(args);
      return;
    case 'bigint':
      if (spec.min !== undefined) args.min = spec.min;
      if (spec.max !== undefined) args.max = spec.max;
      await api.createBigIntColumn(args);
      return;
    case 'float':
    case 'double':
      if (spec.min !== undefined) args.min = spec.min;
      if (spec.max !== undefined) args.max = spec.max;
      await api.createFloatColumn(args);
      return;
    case 'boolean':
      await api.createBooleanColumn(args);
      return;
    case 'datetime':
      await api.createDatetimeColumn(args);
      return;
    case 'email':
      await api.createEmailColumn(args);
      return;
    case 'url':
      await api.createUrlColumn(args);
      return;
    case 'enum':
      args.elements = spec.elements ?? [];
      await api.createEnumColumn(args);
      return;
    default:
      throw new Error(`Unsupported Appwrite column type "${spec.type}" on ${tableId}.${spec.key}.`);
  }
}

async function listColumns(api: AppwriteApi, databaseId: string, tableId: string) {
  return asList(await api.listColumns({ databaseId, tableId }), 'columns');
}

async function waitForColumns(api: AppwriteApi, databaseId: string, tableId: string, expectedKeys: string[]) {
  let columns = await listColumns(api, databaseId, tableId);
  for (let attempt = 0; attempt <= MAX_SCHEMA_POLLS; attempt += 1) {
    const byKey = new Map(columns.map((column) => [String(column.key), column]));
    const failed = expectedKeys.find((key) => ['failed', 'stuck'].includes(String(byKey.get(key)?.status ?? '').toLowerCase()));
    if (failed) throw new Error(`Appwrite could not create column ${tableId}.${failed}.`);
    if (expectedKeys.every((key) => {
      const status = String(byKey.get(key)?.status ?? 'available').toLowerCase();
      return byKey.has(key) && status === 'available';
    })) return columns;
    if (attempt === MAX_SCHEMA_POLLS) break;
    await new Promise((resolve) => setTimeout(resolve, WAIT_BETWEEN_SCHEMA_POLLS_MS));
    columns = await listColumns(api, databaseId, tableId);
  }
  throw new Error(`Timed out waiting for Appwrite columns on ${tableId}.`);
}

function assertCompatibleColumn(tableId: string, expected: ColumnSpec, actual: AppwriteResource) {
  if (normalizedType(actual.type) !== normalizedType(expected.type)) {
    throw new Error(`Schema mismatch for ${tableId}.${expected.key}: expected ${expected.type}, found ${String(actual.type)}. Existing columns are not changed automatically.`);
  }
  if (typeof actual.required === 'boolean' && actual.required !== (expected.required ?? false)) {
    throw new Error(`Schema mismatch for ${tableId}.${expected.key}: required differs. Existing columns are not changed automatically.`);
  }
  if (expected.size !== undefined && typeof actual.size === 'number' && actual.size !== expected.size) {
    throw new Error(`Schema mismatch for ${tableId}.${expected.key}: expected size ${expected.size}, found ${actual.size}. Existing columns are not changed automatically.`);
  }
  if (expected.array !== undefined && typeof actual.array === 'boolean' && actual.array !== expected.array) {
    throw new Error(`Schema mismatch for ${tableId}.${expected.key}: array setting differs. Existing columns are not changed automatically.`);
  }
  if (expected.elements && Array.isArray(actual.elements) && !valuesMatch(actual.elements, expected.elements)) {
    throw new Error(`Schema mismatch for ${tableId}.${expected.key}: enum values differ. Existing columns are not changed automatically.`);
  }
}

async function syncColumns(api: AppwriteApi, databaseId: string, table: TableSpec) {
  let columns = await listColumns(api, databaseId, table.$id);
  const existingKeys = new Set(columns.map((column) => String(column.key)));
  for (const column of table.columns) {
    if (existingKeys.has(column.key)) continue;
    try {
      await createColumn(api, databaseId, table.$id, column);
      console.log(`  Added column: ${table.$id}.${column.key}`);
    } catch (error) {
      if (!isAlreadyCreated(error)) throw error;
      console.log(`  Column was created concurrently: ${table.$id}.${column.key}`);
    }
  }

  columns = await waitForColumns(api, databaseId, table.$id, table.columns.map((column) => column.key));
  const byKey = new Map(columns.map((column) => [String(column.key), column]));
  for (const expected of table.columns) {
    const actual = byKey.get(expected.key);
    if (actual) assertCompatibleColumn(table.$id, expected, actual);
  }
}

async function syncIndexes(api: AppwriteApi, databaseId: string, table: TableSpec) {
  const indexes = asList(await api.listIndexes({ databaseId, tableId: table.$id }), 'indexes');
  const existingByKey = new Map(indexes.map((index) => [String(index.key), index]));
  for (const index of table.indexes ?? []) {
    const existing = existingByKey.get(index.key);
    if (existing) {
      const actualColumns = Array.isArray(existing.columns) ? existing.columns.map(String) : [];
      if (String(existing.type) !== index.type || !valuesMatch(actualColumns, index.columns)) {
        throw new Error(`Schema mismatch for ${table.$id} index ${index.key}. Existing indexes are not changed automatically.`);
      }
      continue;
    }
    const args: Record<string, unknown> = {
      databaseId,
      tableId: table.$id,
      key: index.key,
      type: index.type,
      columns: index.columns,
    };
    if (index.orders) args.orders = index.orders;
    if (index.lengths) args.lengths = index.lengths;
    try {
      await api.createIndex(args);
      console.log(`  Added index: ${table.$id}.${index.key}`);
    } catch (error) {
      if (!isAlreadyCreated(error)) throw error;
      console.log(`  Index was created concurrently: ${table.$id}.${index.key}`);
    }
  }
}

async function syncTable(api: AppwriteApi, databaseId: string, table: TableSpec) {
  let exists = true;
  try {
    await api.getTable({ databaseId, tableId: table.$id });
  } catch (error) {
    if (!isMissingResource(error)) throw error;
    exists = false;
  }

  if (!exists) {
    try {
      await api.createTable({
        databaseId,
        tableId: table.$id,
        name: table.name,
        permissions: table.$permissions ?? [],
        rowSecurity: table.rowSecurity ?? false,
        enabled: table.enabled ?? true,
      });
      console.log(`Created table: ${table.$id}`);
    } catch (error) {
      if (!isAlreadyCreated(error)) throw error;
      console.log(`Table was created concurrently: ${table.$id}`);
    }
  } else {
    await api.updateTable({
      databaseId,
      tableId: table.$id,
      name: table.name,
      permissions: table.$permissions ?? [],
      rowSecurity: table.rowSecurity ?? false,
      enabled: table.enabled ?? true,
      purge: true,
    });
    console.log(`Table exists: ${table.$id}`);
  }

  await syncColumns(api, databaseId, table);
  await syncIndexes(api, databaseId, table);
}

async function main() {
  const appwrite = createAppwriteServerClient();
  if (!appwrite) {
    console.error('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_DATABASE_ID before provisioning.');
    process.exitCode = 1;
    return;
  }

  // The checked-in manifest is additive and reviewable: missing databases,
  // tables, columns, and indexes are created while live rows are preserved.
  const api = appwrite.tablesDB as unknown as AppwriteApi;
  await ensureDatabase(api, appwrite.databaseId);
  for (const table of tables as TableSpec[]) await syncTable(api, appwrite.databaseId, table);
  console.log(`Provisioned ${tables.length} Coconut TablesDB tables and reconciled their columns and indexes.`);
  console.log('Run npm run appwrite:seed next to load the canonical demo rows.');
}

main().catch((error) => {
  console.error('Appwrite provisioning failed:', errorMessage(error));
  process.exitCode = 1;
});
