import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export type Database = typeof db;

/**
 * Close the shared PostgreSQL client during controlled process shutdown or
 * integration-test teardown. Runtime request handlers should not call this.
 */
export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
