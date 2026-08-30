import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Generate from the compiled runtime schema so Node ESM keeps explicit .js
  // specifiers while drizzle-kit loads the exact code that the backend executes.
  schema: './dist/db/schema/index.js',
  out: './db/p0-generated-baseline',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/emopet',
  },
});
