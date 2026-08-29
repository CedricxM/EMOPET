import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/p0-generated-baseline',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet',
  },
});
