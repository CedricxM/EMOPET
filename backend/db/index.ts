import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet';

// Disposable integration tests must not keep the Node test runner alive on an
// idle PostgreSQL socket. Production keeps the driver's normal pool settings.
const client = postgres(
  connectionString,
  process.env['NODE_ENV'] === 'test' ? { idle_timeout: 1 } : {},
);
export const db = drizzle(client, { schema });
export type Database = typeof db;
