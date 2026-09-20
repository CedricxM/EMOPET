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

function streamedRequest(chunks: Uint8Array[], headers?: HeadersInit) {
  const state = { pulls: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[state.pulls++];
      if (chunk) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() { state.cancelled = true; },
  }, { highWaterMark: 0 });
  const req = new Request('https://example.test/api', {
    method: 'POST', headers, body, duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  return { req, state };
}

test('readLimitedJson stops at the first oversized chunk without trusting Content-Length', async () => {
  for (const headers of [undefined, { 'content-length': '1' }]) {
    const { req, state } = streamedRequest([
      Buffer.from('{"x":"'), Buffer.from('a'.repeat(20)), Buffer.from('never consumed"}'),
    ], headers);
    assert.deepEqual(await readLimitedJson(req, 16), {
      ok: false, status: 413, error: 'payload_too_large',
    });
    assert.equal(state.pulls, 2, 'the rest of the body must not be buffered');
    assert.equal(state.cancelled, true);
    assert.equal(req.body?.locked, false);
  }
});

test('readLimitedJson rejects oversized Content-Length without reading any body chunk', async () => {
  const { req, state } = streamedRequest([Buffer.from('{"ok":true}')], { 'content-length': '17' });
  assert.deepEqual(await readLimitedJson(req, 16), { ok: false, status: 413, error: 'payload_too_large' });
  assert.equal(state.pulls, 0);
  assert.equal(state.cancelled, true);
});

test('readLimitedJson counts wire bytes and preserves split UTF-8 at the exact limit', async () => {
  const bytes = Buffer.from(JSON.stringify({ message: 'été 🐕' }));
  const chunks = Array.from(bytes, (byte) => Uint8Array.of(byte));
  const exact = streamedRequest(chunks);
  assert.deepEqual(await readLimitedJson(exact.req, bytes.length), {
    ok: true, data: { message: 'été 🐕' },
  });
  const tooLarge = streamedRequest(chunks);
  assert.deepEqual(await readLimitedJson(tooLarge.req, bytes.length - 1), {
    ok: false, status: 413, error: 'payload_too_large',
  });
  assert.equal(tooLarge.state.cancelled, true);
});

test('readLimitedJson preserves request.text BOM handling', async () => {
  const { req } = streamedRequest([Uint8Array.of(0xef), Uint8Array.of(0xbb, 0xbf), Buffer.from('{"ok":true}')]);
  assert.deepEqual(await readLimitedJson(req, 32), { ok: true, data: { ok: true } });
});

test('readLimitedJson keeps invalid JSON and empty bodies as 400', async () => {
  for (const body of ['{', '', undefined]) {
    const req = new Request('https://example.test/api', { method: 'POST', body });
    assert.deepEqual(await readLimitedJson(req, 16), { ok: false, status: 400, error: 'invalid_json' });
  }
});

test('readLimitedJson handles failed and consumed body streams as 400', async () => {
  const broken = new Request('https://example.test/api', {
    method: 'POST',
    body: new ReadableStream({ pull(controller) { controller.error(new Error('disconnected')); } }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  assert.deepEqual(await readLimitedJson(broken, 16), {
    ok: false, status: 400, error: 'invalid_request_body',
  });
  assert.equal(broken.body?.locked, false);

  const used = new Request('https://example.test/api', { method: 'POST', body: '{}' });
  await used.text();
  assert.deepEqual(await readLimitedJson(used, 16), {
    ok: false, status: 400, error: 'invalid_request_body',
  });
});

test('readLimitedJson returns 413 even if cancelling the transport fails', async () => {
  const req = new Request('https://example.test/api', {
    method: 'POST',
    body: new ReadableStream({
      pull(controller) { controller.enqueue(Buffer.from('oversized')); },
      cancel() { throw new Error('transport already gone'); },
    }, { highWaterMark: 0 }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  assert.deepEqual(await readLimitedJson(req, 4), { ok: false, status: 413, error: 'payload_too_large' });
});

test('cleanDisplayName strips controls and falls back safely', () => {
  assert.equal(cleanDisplayName('  Alice\u0000\n ', 'Membre'), 'Alice');
  assert.equal(cleanDisplayName('   ', 'Membre'), 'Membre');
  assert.equal(cleanDisplayName('a'.repeat(80), 'Membre').length, 40);
});
