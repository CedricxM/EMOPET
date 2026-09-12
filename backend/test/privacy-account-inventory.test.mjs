import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function persistedUserColumns(source) {
  const match = source.match(/export const users = pgTable\('users', \{([\s\S]*?)\n\}\);/);
  assert.ok(match, 'users pgTable block must exist');

  const columns = [...match[1].matchAll(/\w+:\s*\w+\('([^']+)'/g)].map((item) => item[1]);
  return columns.map((column) => column === 'id' ? 'user_id' : column).sort();
}

test('privacy account inventory covers every persisted users column without blanket export approval', async () => {
  const [schemaSource, inventorySource] = await Promise.all([
    readFile(new URL('../db/schema/users.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../config/privacy/data-inventory.json', import.meta.url), 'utf8'),
  ]);

  const inventory = JSON.parse(inventorySource);
  const account = inventory.categories.find((category) => category.id === 'account');
  assert.ok(account, 'privacy inventory must define account category');

  const persisted = persistedUserColumns(schemaSource);
  const inventoried = [...account.data].sort();
  assert.deepEqual(inventoried, persisted, 'every persisted users column must be visible in privacy inventory');

  for (const field of ['password_hash', 'push_token']) {
    assert.ok(account.data.includes(field), `${field} must not disappear from privacy mapping`);
  }

  assert.equal(account.exportable, 'FIELD_LEVEL_PROJECTION_REQUIRED');
  assert.match(account.rightsProjection, /TO_CONFIRM/);
  assert.match(account.retention, /TO_CONFIRM/);
  assert.equal(account.data.includes('gdpr_consent'), false, 'inventory must use actual gdpr_consent_at column');
});
