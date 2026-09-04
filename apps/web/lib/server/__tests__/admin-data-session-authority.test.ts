import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin data page uses only canonical privileged session authority', async () => {
  const pageUrl = new URL('../../../app/admin/data/page.tsx', import.meta.url);
  const source = await readFile(pageUrl, 'utf8');

  assert.equal(source.includes('authorizePrivilegedSessionToken'), true);
  assert.equal(source.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(source.includes('PRIVILEGED_SESSION_COOKIE'), true);
  assert.equal(source.includes("'admin.data.read'"), true);

  for (const legacy of [
    'ADMIN_TOKEN_COOKIE',
    'isAdminTokenValue',
    'breiz-admin-token',
    'x-admin-token',
    'ADMIN_TOKEN',
  ]) {
    assert.equal(source.includes(legacy), false, `legacy authority must be absent: ${legacy}`);
  }
});

test('admin data denial copy does not instruct operators to load a legacy token', async () => {
  const pageUrl = new URL('../../../app/admin/data/page.tsx', import.meta.url);
  const source = await readFile(pageUrl, 'utf8');

  assert.equal(source.includes('session privilegiee'), true);
  assert.equal(source.includes('Chargez le token'), false);
  assert.equal(source.includes('token admin'), false);
});
