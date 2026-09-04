import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizePrivilegedRequest,
  unavailablePrivilegedAuthorizationVerifier,
  type PrivilegedAuthorizationVerifier,
} from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ACTION = 'moderation.queue.read' as const;

test('privileged request requires a Bearer credential and ignores legacy admin headers', async () => {
  let calls = 0;
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      calls += 1;
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  const legacyOnly = new Request('https://example.test/api/admin/moderation', {
    headers: { 'x-admin-token': 'legacy-static-token' },
  });
  assert.deepEqual(
    await authorizePrivilegedRequest(legacyOnly, ACTION, verifier),
    { status: 'DENIED', reason: 'missing_bearer' },
  );
  assert.equal(calls, 0);

  for (const authorization of ['Basic abcdefghijklmnop', 'Bearer ', 'Bearer short', 'Bearer token with spaces']) {
    assert.deepEqual(
      await authorizePrivilegedRequest(
        new Request('https://example.test/api/admin/moderation', { headers: { authorization } }),
        ACTION,
        verifier,
      ),
      { status: 'DENIED', reason: 'invalid_bearer' },
    );
  }
  assert.equal(calls, 0);
});

test('privileged request authorizes only the exact action returned by the verifier', async () => {
  const token = 'privileged-token-value-1234567890';
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await authorizePrivilegedRequest(
      new Request('https://example.test/api/admin/moderation', {
        headers: { authorization: `Bearer ${token}` },
      }),
      ACTION,
      verifier,
    ),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );

  const wrongActionVerifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: 'moderation.post.manage' };
    },
  };
  assert.deepEqual(
    await authorizePrivilegedRequest(
      new Request('https://example.test/api/admin/moderation', {
        headers: { authorization: `Bearer ${token}` },
      }),
      ACTION,
      wrongActionVerifier,
    ),
    { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' },
  );
});

test('privileged request fails closed on unavailable, throwing or malformed verifier authority', async () => {
  const req = new Request('https://example.test/api/admin/moderation', {
    headers: { authorization: 'Bearer privileged-token-value-1234567890' },
  });

  assert.deepEqual(
    await authorizePrivilegedRequest(req, ACTION, unavailablePrivilegedAuthorizationVerifier),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );

  assert.deepEqual(
    await authorizePrivilegedRequest(req, ACTION, { async authorize() { throw new Error('provider down'); } }),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );

  for (const malformed of [
    null,
    { status: 'AUTHORIZED', subject: 'not-a-uuid', action: ACTION },
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION, token: 'must-not-be-returned' },
    { status: 'DENIED', reason: 'free-form-provider-detail' },
  ]) {
    assert.deepEqual(
      await authorizePrivilegedRequest(req, ACTION, { async authorize() { return malformed; } }),
      { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' },
    );
  }
});

test('moderation route uses canonical privileged authority and no legacy or placeholder authority', async () => {
  const routeUrl = new URL('../../../app/api/admin/moderation/route.ts', import.meta.url);
  const source = await readFile(routeUrl, 'utf8');

  assert.equal(source.includes('isAdmin('), false);
  assert.equal(source.includes('ADMIN_TOKEN'), false);
  assert.equal(source.includes('x-admin-token'), false);
  assert.equal(source.includes("'moderation.queue.read'"), true);
  assert.equal(source.includes('canonicalPrivilegedAuthorizationVerifier'), true);
  assert.equal(source.includes('unavailablePrivilegedAuthorizationVerifier'), false);
});
