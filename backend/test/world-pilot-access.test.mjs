import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const migration = read('../db/migrations/0031_world_pilot_access.sql');
const schema = read('../db/schema/world-pilot-access.ts');

test('WORLD-SOCIAL-03 (#596, L1): one pilot row per account, adulthood declared before any grant', () => {
  assert.match(migration, /user_id UUID PRIMARY KEY\s+CONSTRAINT world_pilot_access_user_id_users_id_fk REFERENCES users\(id\),/);
  assert.match(migration, /adult_self_declared_at TIMESTAMPTZ NOT NULL/);
  assert.match(migration, /CONSTRAINT chk_world_pilot_access_declared_before_grant CHECK \(adult_self_declared_at <= granted_at\)/);
  assert.match(migration, /CONSTRAINT chk_world_pilot_access_revoked_after_grant CHECK \(revoked_at IS NULL OR revoked_at >= granted_at\)/);
});

test('erasure disposition is not inferred: no database cascade on the account reference', () => {
  assert.doesNotMatch(migration, /ON DELETE/i);
  assert.match(schema, /uuid\('user_id'\)\.primaryKey\(\)\.references\(\(\) => users\.id\),/);
  assert.doesNotMatch(schema, /onDelete:/);
});

test('the pilot flag stores no social, dog, location or free-text data', () => {
  const columns = [...migration.matchAll(/^\s{2}([a-z_]+) (UUID|TIMESTAMPTZ)/gm)].map((match) => match[1]);
  assert.deepEqual(columns, ['user_id', 'adult_self_declared_at', 'granted_at', 'revoked_at']);
  assert.doesNotMatch(migration, /\b(TEXT|VARCHAR|JSONB|dog_id|lat|lon)\b/i);
});

test('Drizzle schema carries the same named checks as the SQL migration', () => {
  for (const name of ['chk_world_pilot_access_declared_before_grant', 'chk_world_pilot_access_revoked_after_grant']) {
    assert.ok(schema.includes(`check('${name}'`), name);
  }
});
