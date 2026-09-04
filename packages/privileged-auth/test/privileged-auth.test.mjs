import assert from 'node:assert/strict';
import test from 'node:test';
import * as jose from 'jose';

import {
  PRIVILEGED_ACTIONS,
  PRIVILEGED_TOKEN_AUDIENCE,
  PRIVILEGED_TOKEN_ISSUER,
  authorizePrivilegedAccessToken,
  evaluatePrivilegedAuthority,
  getAllowedPrivilegedActions,
  signPrivilegedAccessToken,
  verifyPrivilegedAccessToken,
} from '../dist/index.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';
const PRIVILEGED_SECRET = 'p'.repeat(48);
const ORDINARY_SECRET = 'o'.repeat(48);
const NOW = new Date('2026-09-04T09:00:00.000Z');
const MFA_AT = new Date('2026-09-04T08:58:00.000Z');

const key = {
  secret: PRIVILEGED_SECRET,
  ordinaryJwtSecret: ORDINARY_SECRET,
};

test('canonical privileged token roundtrip preserves bounded MFA assurance', async () => {
  const token = await signPrivilegedAccessToken({
    subject: ADMIN_ID,
    role: 'admin',
    mfaMethod: 'webauthn',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 600,
    key,
    now: NOW,
  });

  const payload = await verifyPrivilegedAccessToken(token, key, new Date('2026-09-04T09:05:00.000Z'));
  assert.equal(payload.sub, ADMIN_ID);
  assert.equal(payload.role, 'admin');
  assert.equal(payload.tokenUse, 'privileged');
  assert.equal(payload.mfaMethod, 'webauthn');
  assert.equal(payload.mfaAt, Math.floor(MFA_AT.getTime() / 1_000));
  assert.equal(payload.expiresAt - payload.issuedAt, 600);
});

test('privileged signing key cannot silently reuse the ordinary Guardian JWT secret', async () => {
  await assert.rejects(
    signPrivilegedAccessToken({
      subject: ADMIN_ID,
      role: 'admin',
      mfaMethod: 'idp_mfa',
      mfaVerifiedAt: MFA_AT,
      tokenTtlSeconds: 300,
      key: { secret: ORDINARY_SECRET, ordinaryJwtSecret: ORDINARY_SECRET },
      now: NOW,
    }),
    /distinct/i,
  );
});

test('RBAC vocabulary is finite, has no wildcard and keeps web-admin actions admin-only', () => {
  assert.equal(PRIVILEGED_ACTIONS.includes('*'), false);
  assert.equal(getAllowedPrivilegedActions('admin').includes('moderation.queue.read'), true);
  assert.equal(getAllowedPrivilegedActions('admin').includes('contact.request.manage'), true);
  assert.equal(getAllowedPrivilegedActions('support').includes('moderation.queue.read'), false);
  assert.equal(getAllowedPrivilegedActions('support').includes('contact.request.read'), false);
  assert.equal(getAllowedPrivilegedActions('operator').includes('admin.data.read'), false);

  assert.deepEqual(evaluatePrivilegedAuthority('support', 'support.case.read_limited'), {
    allowed: true,
    reason: 'allowed',
  });
  assert.deepEqual(evaluatePrivilegedAuthority('support', 'contact.request.manage'), {
    allowed: false,
    reason: 'action_not_allowed',
  });
  assert.deepEqual(evaluatePrivilegedAuthority('guardian', 'account.read_limited'), {
    allowed: false,
    reason: 'invalid_role',
  });
  assert.deepEqual(evaluatePrivilegedAuthority('admin', 'not.real'), {
    allowed: false,
    reason: 'invalid_action',
  });
});

test('authorization composes verified token assurance with the exact finite action', async () => {
  const adminToken = await signPrivilegedAccessToken({
    subject: ADMIN_ID,
    role: 'admin',
    mfaMethod: 'webauthn',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 600,
    key,
    now: NOW,
  });
  assert.deepEqual(
    await authorizePrivilegedAccessToken({
      token: adminToken,
      action: 'moderation.queue.read',
      key,
      now: new Date('2026-09-04T09:01:00.000Z'),
    }),
    {
      status: 'AUTHORIZED',
      subject: ADMIN_ID,
      role: 'admin',
      action: 'moderation.queue.read',
      mfaMethod: 'webauthn',
    },
  );

  const supportToken = await signPrivilegedAccessToken({
    subject: SUPPORT_ID,
    role: 'support',
    mfaMethod: 'idp_mfa',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 600,
    key,
    now: NOW,
  });
  assert.deepEqual(
    await authorizePrivilegedAccessToken({
      token: supportToken,
      action: 'moderation.queue.read',
      key,
      now: new Date('2026-09-04T09:01:00.000Z'),
    }),
    {
      status: 'DENIED',
      reason: 'action_not_allowed',
      subject: SUPPORT_ID,
      role: 'support',
      action: 'moderation.queue.read',
    },
  );
});

test('invalid tokens remain anonymous denials and cannot contribute actor identity', async () => {
  const result = await authorizePrivilegedAccessToken({
    token: 'not-a-valid-privileged-jwt-1234567890',
    action: 'moderation.queue.read',
    key,
    now: new Date('2026-09-04T09:01:00.000Z'),
  });

  assert.deepEqual(result, { status: 'DENIED', reason: 'invalid_token' });
  assert.equal('subject' in result, false);
  assert.equal('role' in result, false);
  assert.equal('action' in result, false);
});

test('expired privileged tokens fail closed', async () => {
  const token = await signPrivilegedAccessToken({
    subject: ADMIN_ID,
    role: 'admin',
    mfaMethod: 'totp',
    mfaVerifiedAt: MFA_AT,
    tokenTtlSeconds: 60,
    key,
    now: NOW,
  });

  await assert.rejects(
    verifyPrivilegedAccessToken(token, key, new Date('2026-09-04T09:02:00.000Z')),
  );
});

test('wrong audience, token use and malformed MFA claims cannot cross into privileged verification', async () => {
  const secret = new TextEncoder().encode(PRIVILEGED_SECRET);
  const issuedAt = Math.floor(NOW.getTime() / 1_000);

  async function forged(claims, audience = PRIVILEGED_TOKEN_AUDIENCE) {
    return new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(ADMIN_ID)
      .setIssuer(PRIVILEGED_TOKEN_ISSUER)
      .setAudience(audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + 300)
      .sign(secret);
  }

  const wrongAudience = await forged({
    token_use: 'privileged',
    role: 'admin',
    mfa_method: 'webauthn',
    mfa_at: issuedAt - 30,
    amr: ['mfa', 'webauthn'],
  }, 'emopet-client');
  await assert.rejects(verifyPrivilegedAccessToken(wrongAudience, key, NOW));

  const wrongUse = await forged({
    token_use: 'access',
    role: 'admin',
    mfa_method: 'webauthn',
    mfa_at: issuedAt - 30,
    amr: ['mfa', 'webauthn'],
  });
  await assert.rejects(verifyPrivilegedAccessToken(wrongUse, key, NOW), /token use/i);

  const malformedAmr = await forged({
    token_use: 'privileged',
    role: 'admin',
    mfa_method: 'webauthn',
    mfa_at: issuedAt - 30,
    amr: ['pwd'],
  });
  await assert.rejects(verifyPrivilegedAccessToken(malformedAmr, key, NOW), /assurance/i);

  const futureMfa = await forged({
    token_use: 'privileged',
    role: 'admin',
    mfa_method: 'webauthn',
    mfa_at: issuedAt + 1,
    amr: ['mfa', 'webauthn'],
  });
  await assert.rejects(verifyPrivilegedAccessToken(futureMfa, key, NOW), /chronology/i);
});
