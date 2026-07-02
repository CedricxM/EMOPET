import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { adminConfigured, isAdmin } from '../admin';

const originalAdminToken = process.env['ADMIN_TOKEN'];

afterEach(() => {
  if (originalAdminToken == null) delete process.env['ADMIN_TOKEN'];
  else process.env['ADMIN_TOKEN'] = originalAdminToken;
});

test('admin gate is closed when ADMIN_TOKEN is missing', () => {
  delete process.env['ADMIN_TOKEN'];

  assert.equal(adminConfigured(), false);
  assert.equal(isAdmin(new Request('https://example.test/api/admin/moderation')), false);
});

test('admin gate accepts only the configured token', () => {
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
