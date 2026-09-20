import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('context route reuses the canonical proxy-trust rate-limit boundary', async () => {
  const routeUrl = new URL('../../../app/api/context/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes("from '../../../lib/server/request-security'"), true);
  assert.equal(source.includes("createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 })"), true);
  assert.equal(source.includes("enforceRateLimit(req, limiter, 'context')"), true);

  assert.equal(source.includes('function clientKey'), false);
  assert.equal(source.includes("req.headers.get('x-forwarded-for')"), false);
  assert.equal(source.includes("req.headers.get('x-real-ip')"), false);
  assert.equal(source.includes("req.headers.get('cf-connecting-ip')"), false);
});
