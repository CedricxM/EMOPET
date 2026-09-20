import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { rateLimitResponse } from '../server/request-security';

test('shared rate-limit responses are private and non-cacheable', async () => {
  const response = rateLimitResponse({
    ok: false,
    limit: 10,
    remaining: 0,
    resetAt: Date.now() + 60_000,
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('sensitive Contact/admin route responses declare private no-store semantics', async () => {
  const routeFiles = [
    '../../app/api/contact/route.ts',
    '../../app/api/admin/moderation/route.ts',
    '../../app/api/admin/contact/[id]/route.ts',
    '../../app/api/admin/posts/[id]/route.ts',
  ];

  for (const relative of routeFiles) {
    const source = await readFile(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
    assert.match(
      source,
      /['"]Cache-Control['"]:\s*['"]private, no-store['"]/,
      `${relative} must explicitly prevent caching of sensitive responses`,
    );
  }
});

test('privileged admin data page is explicitly dynamic and non-revalidated', async () => {
  const source = await readFile(
    fileURLToPath(new URL('../../app/admin/data/page.tsx', import.meta.url)),
    'utf8',
  );

  assert.match(source, /export const dynamic = ['"]force-dynamic['"]/);
  assert.match(source, /export const revalidate = 0/);
  assert.match(source, /await cookies\(\)/);
});
