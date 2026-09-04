import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin UI no longer stores or emits legacy admin credentials', async () => {
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

test('admin UI remains read-only until canonical mutation wiring exists', async () => {
  const pageUrl = new URL('../../../app/admin/page.tsx', import.meta.url);
  const source = await readFile(pageUrl, 'utf8');

  assert.equal(source.includes("method: 'PATCH'"), false);
  assert.equal(source.includes('setStatus('), false);
  assert.equal(source.includes('moderate('), false);
  assert.equal(source.includes('temporairement désactivées'), true);
});
