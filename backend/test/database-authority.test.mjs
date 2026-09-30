import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateRuntimeDatabaseAuthority,
  resolveMigrationDatabaseUrl,
  resolveRuntimeDatabaseUrl,
} from '../dist/db/database-authority.js';

test('production runtime requires explicit DATABASE_URL', () => {
  assert.throws(
    () => resolveRuntimeDatabaseUrl({ NODE_ENV: 'production' }),
    /DATABASE_URL must be configured/,
  );

  assert.equal(
    resolveRuntimeDatabaseUrl({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://runtime@example/db',
    }),
    'postgres://runtime@example/db',
  );
});

test('production migrations require a distinct migration authority variable', () => {
  assert.throws(
    () => resolveMigrationDatabaseUrl({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://runtime@example/db',
    }),
    /MIGRATION_DATABASE_URL must be configured separately/,
  );

  assert.equal(
    resolveMigrationDatabaseUrl({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://runtime@example/db',
      MIGRATION_DATABASE_URL: 'postgres://migrator@example/db',
    }),
    'postgres://migrator@example/db',
  );
});

test('development may retain the local fallback and DATABASE_URL migration compatibility', () => {
  assert.equal(
    resolveRuntimeDatabaseUrl({ NODE_ENV: 'development' }),
    'postgres://localhost:5432/emopet',
  );
  assert.equal(
    resolveMigrationDatabaseUrl({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://dev@example/db',
    }),
    'postgres://dev@example/db',
  );
});

test('runtime role evaluator rejects broad PostgreSQL authority', () => {
  const safe = {
    roleName: 'emopet_runtime',
    superuser: false,
    createRole: false,
    createDb: false,
    replication: false,
    bypassRls: false,
    canCreatePublicSchema: false,
  };

  assert.deepEqual(evaluateRuntimeDatabaseAuthority(safe), {
    ok: true,
    violations: [],
  });

  const unsafe = evaluateRuntimeDatabaseAuthority({
    ...safe,
    superuser: true,
    createRole: true,
    createDb: true,
    replication: true,
    bypassRls: true,
    canCreatePublicSchema: true,
  });

  assert.equal(unsafe.ok, false);
  assert.deepEqual(unsafe.violations, [
    'SUPERUSER',
    'CREATEROLE',
    'CREATEDB',
    'REPLICATION',
    'BYPASSRLS',
    'PUBLIC_SCHEMA_CREATE',
  ]);
});
