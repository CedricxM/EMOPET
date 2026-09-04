import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizePrivilegedSessionToken,
  type PrivilegedAuthorizationVerifier,
} from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ACTION = 'admin.data.read' as const;
const TOKEN = 'privileged-session-token-value-1234567890';

test('privileged session authorization fails closed before verifier on missing or malformed session values', async () => {
  let calls = 0;
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize() {
      calls += 1;
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  for (const missing of [undefined, null]) {
    assert.deepEqual(
      await authorizePrivilegedSessionToken(missing, ACTION, verifier),
      { status: 'DENIED', reason: 'missing_session' },
    );
  }

  for (const malformed of ['', 'short', 'token with spaces']) {
    assert.deepEqual(
      await authorizePrivilegedSessionToken(malformed, ACTION, verifier),
      { status: 'DENIED', reason: 'invalid_session' },
    );
  }

  assert.equal(calls, 0);
});

test('privileged session authorization asks the canonical verifier for the exact finite action', async () => {
  const verifier: PrivilegedAuthorizationVerifier = {
    async authorize(input) {
      assert.deepEqual(input, { token: TOKEN, action: ACTION });
      return { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION };
    },
  };

  assert.deepEqual(
    await authorizePrivilegedSessionToken(TOKEN, ACTION, verifier),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});

test('privileged session authorization rejects denied, unavailable, throwing and malformed verifier authority', async () => {
  assert.deepEqual(
    await authorizePrivilegedSessionToken(TOKEN, ACTION, { async authorize() { return { status: 'DENIED' }; } }),
    { status: 'DENIED', reason: 'not_authorized' },
  );

  assert.deepEqual(
    await authorizePrivilegedSessionToken(TOKEN, ACTION, { async authorize() { return { status: 'UNAVAILABLE' }; } }),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );

  assert.deepEqual(
    await authorizePrivilegedSessionToken(TOKEN, ACTION, { async authorize() { throw new Error('provider down'); } }),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );

  for (const malformed of [
    null,
    { status: 'AUTHORIZED', subject: 'not-a-uuid', action: ACTION },
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: 'contact.request.read' },
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION, token: 'must-not-be-returned' },
    { status: 'DENIED', reason: 'free-form-provider-detail' },
  ]) {
    assert.deepEqual(
      await authorizePrivilegedSessionToken(TOKEN, ACTION, { async authorize() { return malformed; } }),
      { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' },
    );
  }
});

test('web action inventory remains a compile-time subset of canonical privileged actions', async () => {
  const privilegedRequestModule = await import('../privileged-request');
  assert.deepEqual(privilegedRequestModule.PRIVILEGED_WEB_ACTIONS, [
    'moderation.queue.read',
    'contact.request.read',
    'admin.data.read',
  ]);
});
