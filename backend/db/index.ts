import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet';

// Test runs use disposable databases. Close idle pool connections promptly so
// the Node test runner can exit cleanly instead of waiting on postgres sockets.
const client = postgres(
  connectionString,
  process.env['NODE_ENV'] === 'test' ? { idle_timeout: 1 } : {},
);
export const db = drizzle(client, { schema });
export type Database = typeof db;

/**
 * Close the shared PostgreSQL client during controlled process shutdown or
 * integration-test teardown. Runtime request handlers should not call this.
 */
export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
