import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { adminConfigured, isAdmin } from '../admin';

const mutableEnv = process.env as Record<string, string | undefined>;
const originalAdminToken = mutableEnv['ADMIN_TOKEN'];
const originalNodeEnv = mutableEnv['NODE_ENV'];

afterEach(() => {
  if (originalAdminToken == null) delete mutableEnv['ADMIN_TOKEN'];
  else mutableEnv['ADMIN_TOKEN'] = originalAdminToken;

  if (originalNodeEnv == null) delete mutableEnv['NODE_ENV'];
  else mutableEnv['NODE_ENV'] = originalNodeEnv;
});

test('admin gate is closed when ADMIN_TOKEN is missing', () => {
  mutableEnv['NODE_ENV'] = 'test';
  delete mutableEnv['ADMIN_TOKEN'];

  assert.equal(adminConfigured(), false);
  assert.equal(isAdmin(new Request('https://example.test/api/admin/moderation')), false);
});

test('non-production prototype gate accepts only the configured token', () => {
  mutableEnv['NODE_ENV'] = 'test';
  mutableEnv['ADMIN_TOKEN'] = 'test-admin-token';

  assert.equal(adminConfigured(), true);
  assert.equal(
    isAdmin(new Request('https://example.test/api/admin/moderation', { headers: { 'x-admin-token': 'wrong' } })),
    false,
  );
  assert.equal(
    isAdmin(new Request('https://example.test/api/admin/moderation', { headers: { 'x-admin-token': 'test-admin-token' } })),
    true,
  );
});

test('production rejects the legacy static admin token even when the configured value is correct', () => {
  mutableEnv['NODE_ENV'] = 'production';
  mutableEnv['ADMIN_TOKEN'] = 'production-looking-admin-token';

  assert.equal(adminConfigured(), false);
  assert.equal(
    isAdmin(new Request('https://example.test/api/admin/moderation', {
      headers: { 'x-admin-token': 'production-looking-admin-token' },
    })),
    false,
  );
});
