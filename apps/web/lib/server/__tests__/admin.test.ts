import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { adminConfigured, isAdmin } from '../admin';

const originalAdminToken = process.env['ADMIN_TOKEN'];
const originalNodeEnv = process.env['NODE_ENV'];

afterEach(() => {
  if (originalAdminToken == null) delete process.env['ADMIN_TOKEN'];
  else process.env['ADMIN_TOKEN'] = originalAdminToken;

  if (originalNodeEnv == null) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = originalNodeEnv;
});

test('admin gate is closed when ADMIN_TOKEN is missing', () => {
  process.env['NODE_ENV'] = 'test';
  delete process.env['ADMIN_TOKEN'];

  assert.equal(adminConfigured(), false);
  assert.equal(isAdmin(new Request('https://example.test/api/admin/moderation')), false);
});

test('non-production prototype gate accepts only the configured token', () => {
  process.env['NODE_ENV'] = 'test';
  process.env['ADMIN_TOKEN'] = 'test-admin-token';

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
  process.env['NODE_ENV'] = 'production';
  process.env['ADMIN_TOKEN'] = 'production-looking-admin-token';

  assert.equal(adminConfigured(), false);
  assert.equal(
    isAdmin(new Request('https://example.test/api/admin/moderation', {
      headers: { 'x-admin-token': 'production-looking-admin-token' },
    })),
    false,
  );
});
