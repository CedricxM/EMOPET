import { defineConfig } from 'drizzle-kit';
import { resolveMigrationDatabaseUrl } from './database-authority.js';

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveMigrationDatabaseUrl(),
  },
});
