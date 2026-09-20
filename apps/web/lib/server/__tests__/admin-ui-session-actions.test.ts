import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin UI no longer stores or emits browser-managed privileged credentials', async () => {
  const pageUrl = new URL('../../../app/admin/page.tsx', import.meta.url);
  const source = await readFile(pageUrl, 'utf8');

  for (const legacy of [
    'sessionStorage',
    'breiz-admin-token',
    'x-admin-token',
    'ADMIN_TOKEN',
    'document.cookie',
    'saveToken',
    'Token admin',
  ]) {
    assert.equal(source.includes(legacy), false, `legacy client authority must be absent: ${legacy}`);
  }

  assert.equal(source.includes("fetch('/api/admin/moderation', { cache: 'no-store' })"), true);
  assert.equal(source.includes('Session privilégiée requise ou invalide.'), true);
});

test('D2-A retained moderation actions remain available without explicit privileged headers', async () => {
  const pageUrl = new URL('../../../app/admin/page.tsx', import.meta.url);
  const source = await readFile(pageUrl, 'utf8');

  assert.equal(source.includes('async function setStatus'), true);
  assert.equal(source.includes('async function moderate'), true);
  assert.equal(source.includes("method: 'PATCH'"), true);
  assert.equal(source.includes("'content-type': 'application/json'"), true);
  assert.equal(source.includes('headers()'), false);
  assert.equal(source.includes('x-admin-token'), false);

  for (const action of ['scheduled', 'completed', 'cancelled', "'hide'", "'unhide'", "'dismiss'"]) {
    assert.equal(source.includes(action), true, `retained admin action must remain present: ${action}`);
  }
});
