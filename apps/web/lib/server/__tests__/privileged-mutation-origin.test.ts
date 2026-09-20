import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluatePrivilegedMutationOrigin } from '../privileged-mutation-origin';

const EXPECTED_ORIGIN = 'https://app.emopet.test';

function req(method: string, headers: HeadersInit = {}): Request {
  return new Request(`${EXPECTED_ORIGIN}/api/admin/contact/123`, { method, headers });
}

test('privileged mutation origin gate allows exact same-origin browser mutation', () => {
  assert.deepEqual(
    evaluatePrivilegedMutationOrigin({
      request: req('PATCH', {
        origin: EXPECTED_ORIGIN,
        'sec-fetch-site': 'same-origin',
        referer: `${EXPECTED_ORIGIN}/admin`,
      }),
      expectedOrigin: EXPECTED_ORIGIN,
    }),
    { status: 'ALLOWED' },
  );
});

test('safe methods are explicitly outside the privileged mutation-origin contract', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    assert.deepEqual(
      evaluatePrivilegedMutationOrigin({ request: req(method), expectedOrigin: EXPECTED_ORIGIN }),
      { status: 'NOT_APPLICABLE' },
    );
  }
});

test('missing Origin fails closed even when Referer looks same-origin', () => {
  assert.deepEqual(
    evaluatePrivilegedMutationOrigin({
      request: req('POST', { referer: `${EXPECTED_ORIGIN}/admin` }),
      expectedOrigin: EXPECTED_ORIGIN,
    }),
    { status: 'DENIED', reason: 'missing_origin' },
  );
});

test('cross-origin and hostile lookalike origins fail closed', () => {
  for (const origin of [
    'https://evil.example',
    'https://app.emopet.test.evil.example',
  ]) {
    assert.deepEqual(
      evaluatePrivilegedMutationOrigin({
        request: req('DELETE', { origin, 'sec-fetch-site': 'cross-site' }),
        expectedOrigin: EXPECTED_ORIGIN,
      }),
      { status: 'DENIED', reason: 'origin_mismatch' },
    );
  }
});

test('path-like, opaque and malformed Origin headers are rejected rather than normalized', () => {
  for (const origin of [
    `${EXPECTED_ORIGIN}/admin`,
    `${EXPECTED_ORIGIN}/`,
    'null',
    'not-an-origin',
  ]) {
    assert.deepEqual(
      evaluatePrivilegedMutationOrigin({
        request: req('PATCH', { origin }),
        expectedOrigin: EXPECTED_ORIGIN,
      }),
      { status: 'DENIED', reason: 'invalid_origin' },
    );
  }
});

test('fetch metadata must remain same-origin when present', () => {
  for (const fetchSite of ['cross-site', 'same-site', 'none']) {
    assert.deepEqual(
      evaluatePrivilegedMutationOrigin({
        request: req('PATCH', {
          origin: EXPECTED_ORIGIN,
          'sec-fetch-site': fetchSite,
        }),
        expectedOrigin: EXPECTED_ORIGIN,
      }),
      { status: 'DENIED', reason: 'fetch_site_mismatch' },
    );
  }
});

test('invalid expected-origin configuration and unsupported unsafe methods fail closed', () => {
  for (const expectedOrigin of [
    'not-an-origin',
    `${EXPECTED_ORIGIN}/admin`,
    `${EXPECTED_ORIGIN}?debug=1`,
  ]) {
    assert.deepEqual(
      evaluatePrivilegedMutationOrigin({
        request: req('PATCH', { origin: EXPECTED_ORIGIN }),
        expectedOrigin,
      }),
      { status: 'DENIED', reason: 'invalid_expected_origin' },
    );
  }

  assert.deepEqual(
    evaluatePrivilegedMutationOrigin({
      request: req('BREACH', { origin: EXPECTED_ORIGIN }),
      expectedOrigin: EXPECTED_ORIGIN,
    }),
    { status: 'DENIED', reason: 'unsupported_method' },
  );
});
