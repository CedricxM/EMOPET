import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { createFixedWindowRateLimiter } from '../rate-limit';
import { cleanDisplayName, enforceRateLimit, readLimitedJson, requestClientKey } from '../request-security';

const originalTrustProxy = process.env['EMOPET_TRUST_PROXY_HEADERS'];

afterEach(() => {
  if (originalTrustProxy == null) delete process.env['EMOPET_TRUST_PROXY_HEADERS'];
  else process.env['EMOPET_TRUST_PROXY_HEADERS'] = originalTrustProxy;
});

test('requestClientKey ignores spoofable proxy headers by default', () => {
  delete process.env['EMOPET_TRUST_PROXY_HEADERS'];
  const req = new Request('https://example.test/api', {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
  });

  assert.equal(requestClientKey(req, 'breiz'), 'breiz:local');
});

test('requestClientKey uses forwarding headers only when trusted proxy mode is explicit', () => {
  process.env['EMOPET_TRUST_PROXY_HEADERS'] = 'true';
  const req = new Request('https://example.test/api', {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
  });

  assert.equal(requestClientKey(req, 'breiz'), 'breiz:203.0.113.10');
});

test('spoofed forwarding headers cannot split rate-limit buckets when proxy trust is disabled', () => {
  delete process.env['EMOPET_TRUST_PROXY_HEADERS'];
  const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 60_000 });
  const first = new Request('https://example.test/api', { headers: { 'x-forwarded-for': '203.0.113.10' } });
  const second = new Request('https://example.test/api', { headers: { 'x-forwarded-for': '198.51.100.22' } });

  assert.equal(enforceRateLimit(first, limiter, 'context'), null);
  const denied = enforceRateLimit(second, limiter, 'context');
  assert.notEqual(denied, null);
  assert.equal(denied?.status, 429);
});

test('explicit trusted proxy mode can distinguish rate-limit buckets by trusted forwarding identity', () => {
  process.env['EMOPET_TRUST_PROXY_HEADERS'] = 'true';
  const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 60_000 });
  const first = new Request('https://example.test/api', { headers: { 'x-forwarded-for': '203.0.113.10' } });
  const second = new Request('https://example.test/api', { headers: { 'x-forwarded-for': '198.51.100.22' } });

  assert.equal(enforceRateLimit(first, limiter, 'context'), null);
  assert.equal(enforceRateLimit(second, limiter, 'context'), null);
});

test('readLimitedJson rejects oversized payloads before JSON processing', async () => {
  const req = new Request('https://example.test/api', {
    method: 'POST',
    headers: { 'content-length': '20' },
    body: JSON.stringify({ ok: true }),
  });

  const parsed = await readLimitedJson(req, 4);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.status, 413);
});

test('cleanDisplayName strips controls and falls back safely', () => {
  assert.equal(cleanDisplayName('  Alice\u0000\n ', 'Membre'), 'Alice');
  assert.equal(cleanDisplayName('   ', 'Membre'), 'Membre');
  assert.equal(cleanDisplayName('a'.repeat(80), 'Membre').length, 40);
});
