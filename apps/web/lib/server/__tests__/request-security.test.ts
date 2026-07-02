import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { cleanDisplayName, readLimitedJson, requestClientKey } from '../request-security';

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