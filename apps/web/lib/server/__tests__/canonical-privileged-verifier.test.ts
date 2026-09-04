import assert from 'node:assert/strict';
import test from 'node:test';

import { signPrivilegedAccessToken } from '@emopet/privileged-auth';

import {
  createCanonicalPrivilegedAuthorizationVerifier,
} from '../canonical-privileged-verifier';
import { authorizePrivilegedRequest } from '../privileged-request';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';
const ACTION = 'moderation.queue.read' as const;
const NOW = new Date('2026-09-04T10:00:00.000Z');
const MFA_AT = new Date('2026-09-04T09:58:00.000Z');
const KEY = {
  secret: 'p'.repeat(48),
  ordinaryJwtSecret: 'o'.repeat(48),
};

function requestWith(token: string): Request {
  return new Request('https://example.test/api/admin/moderation', {
    headers: { authorization: `Bearer ${token}` },
  });
}

function verifierFor(key = KEY) {
  return createCanonicalPrivilegedAuthorizationVerifier({
    keyProvider: () => key,
    now: () => new Date('2026-09-04T10:01:00.000Z'),
  });
}

test('canonical adapter authorizes an admin token only for the requested finite action', async () => {
  const token = await signPrivilegedAccessToken({
    subject: ADMIN_ID,
    role: 'admin',
    mfaMethod: 'webauthn',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 600,
    key: KEY,
    now: NOW,
  });

  assert.deepEqual(
    await authorizePrivilegedRequest(requestWith(token), ACTION, verifierFor()),
    { status: 'AUTHORIZED', subject: ADMIN_ID, action: ACTION },
  );
});

test('canonical adapter maps a valid but unauthorized role to bounded denial', async () => {
  const token = await signPrivilegedAccessToken({
    subject: SUPPORT_ID,
    role: 'support',
    mfaMethod: 'idp_mfa',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 600,
    key: KEY,
    now: NOW,
  });

  assert.deepEqual(
    await authorizePrivilegedRequest(requestWith(token), ACTION, verifierFor()),
    { status: 'DENIED', reason: 'not_authorized' },
  );
});

test('invalid bearer is denied while invalid server key configuration is unavailable', async () => {
  assert.deepEqual(
    await authorizePrivilegedRequest(
      requestWith('not-a-valid-privileged-jwt-1234567890'),
      ACTION,
      verifierFor(),
    ),
    { status: 'DENIED', reason: 'not_authorized' },
  );

  assert.deepEqual(
    await authorizePrivilegedRequest(
      requestWith('not-a-valid-privileged-jwt-1234567890'),
      ACTION,
      verifierFor({ secret: 'short', ordinaryJwtSecret: 'o'.repeat(48) }),
    ),
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
  );
});
