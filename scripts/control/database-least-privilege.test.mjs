import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authority, dbIndex, drizzleConfig, apiIndex, envExample] = await Promise.all([
  readFile(new URL('../../backend/db/database-authority.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/drizzle.config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../.env.example', import.meta.url), 'utf8'),
]);

test('production runtime and migration database authorities remain distinct', () => {
  assert.match(authority, /DATABASE_URL must be configured for the production runtime/);
  assert.match(
    authority,
    /MIGRATION_DATABASE_URL must be configured separately for production migrations/,
  );
  assert.match(dbIndex, /resolveRuntimeDatabaseUrl\(\)/);
  assert.match(drizzleConfig, /resolveMigrationDatabaseUrl\(\)/);
  assert.match(envExample, /^DATABASE_URL=/m);
  assert.match(envExample, /^MIGRATION_DATABASE_URL=/m);
});

test('production server verifies runtime PostgreSQL authority before serving', () => {
  const check = apiIndex.indexOf('await assertRuntimeDatabaseAuthority()');
  const start = apiIndex.indexOf('serve({ fetch: app.fetch, port }');

  assert.ok(check >= 0, 'runtime database authority check missing');
  assert.ok(start >= 0, 'server start missing');
  assert.ok(check < start, 'database authority must be checked before serve()');
});

test('runtime role guard rejects broad PostgreSQL admin/DDL capabilities', () => {
  for (const marker of [
    'SUPERUSER',
    'CREATEROLE',
    'CREATEDB',
    'REPLICATION',
    'BYPASSRLS',
    'PUBLIC_SCHEMA_CREATE',
  ]) {
    assert.match(authority, new RegExp(marker));
  }

  assert.match(dbIndex, /rolsuper/);
  assert.match(dbIndex, /rolcreaterole/);
  assert.match(dbIndex, /rolcreatedb/);
  assert.match(dbIndex, /rolreplication/);
  assert.match(dbIndex, /rolbypassrls/);
  assert.match(dbIndex, /has_schema_privilege\(current_user, 'public', 'CREATE'\)/);
});
