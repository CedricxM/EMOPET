import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertInternalOwnerSessionServiceKeyConfig,
  signInternalAlertAckServiceToken,
  signInternalAuditServiceToken,
  signInternalOwnerSessionServiceToken,
  verifyInternalAlertAckServiceToken,
  verifyInternalAuditServiceToken,
  verifyInternalOwnerSessionServiceToken,
} from '../dist/index.js';

const REQUEST_ID = '92500000-0000-4000-8000-000000000001';
const OWNER_SECRET = 'r'.repeat(48);
const ORDINARY_SECRET = 'o'.repeat(48);
const PRIVILEGED_SECRET = 'p'.repeat(48);
const AUDIT_SECRET = 'a'.repeat(48);
const ALERT_ACK_SECRET = 'k'.repeat(48);
const CROSS_DOMAIN_SECRET = 's'.repeat(48);
const NOW = new Date('2026-10-03T09:15:00.000Z');
const BODY = JSON.stringify({
  refreshToken: `emopet_rt_${'x'.repeat(48)}`,
});

function ownerKey(secret = OWNER_SECRET) {
  return {
    secret,
    ordinaryJwtSecret: ORDINARY_SECRET,
    privilegedJwtSecret: PRIVILEGED_SECRET,
    internalAuditServiceSecret: AUDIT_SECRET,
    internalAlertAckServiceSecret: ALERT_ACK_SECRET,
  };
}

test('internal Owner session token binds request id and exact request body', async () => {
  const token = await signInternalOwnerSessionServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: ownerKey(),
    now: NOW,
  });

  const verified = await verifyInternalOwnerSessionServiceToken({
    token,
    body: BODY,
    key: ownerKey(),
    now: new Date('2026-10-03T09:15:10.000Z'),
  });

  assert.equal(verified.requestId, REQUEST_ID);
  assert.match(verified.bodySha256, /^[0-9a-f]{64}$/);
  assert.equal(verified.expiresAt - verified.issuedAt, 30);
});

test('internal Owner session token rejects body tampering and expiry', async () => {
  const token = await signInternalOwnerSessionServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: ownerKey(),
    now: NOW,
  });

  await assert.rejects(
    verifyInternalOwnerSessionServiceToken({
      token,
      body: BODY.replace('emopet_rt_', 'emopet_rx_'),
      key: ownerKey(),
      now: new Date('2026-10-03T09:15:10.000Z'),
    }),
    /digest mismatch/i,
  );

  await assert.rejects(
    verifyInternalOwnerSessionServiceToken({
      token,
      body: BODY,
      key: ownerKey(),
      now: new Date('2026-10-03T09:15:31.000Z'),
    }),
  );
});

test('internal Owner session secret is strong and separated from all existing service/JWT keys', () => {
  assert.throws(
    () => assertInternalOwnerSessionServiceKeyConfig(ownerKey('short')),
    /32 characters/i,
  );

  for (const secret of [
    ORDINARY_SECRET,
    PRIVILEGED_SECRET,
    AUDIT_SECRET,
    ALERT_ACK_SECRET,
  ]) {
    assert.throws(
      () => assertInternalOwnerSessionServiceKeyConfig(ownerKey(secret)),
      /distinct/i,
    );
  }

  assert.doesNotThrow(() =>
    assertInternalOwnerSessionServiceKeyConfig(ownerKey()),
  );
});

test('Owner refresh, audit and alert-ack tokens cannot cross service authorization domains', async () => {
  const ownerToken = await signInternalOwnerSessionServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: {
      ...ownerKey(CROSS_DOMAIN_SECRET),
      internalAuditServiceSecret: AUDIT_SECRET,
      internalAlertAckServiceSecret: ALERT_ACK_SECRET,
    },
    now: NOW,
  });
  const auditToken = await signInternalAuditServiceToken({
    eventId: REQUEST_ID,
    body: BODY,
    key: {
      secret: CROSS_DOMAIN_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
      privilegedJwtSecret: PRIVILEGED_SECRET,
    },
    now: NOW,
  });
  const ackToken = await signInternalAlertAckServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: {
      secret: CROSS_DOMAIN_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
      privilegedJwtSecret: PRIVILEGED_SECRET,
      internalAuditServiceSecret: AUDIT_SECRET,
    },
    now: NOW,
  });

  await assert.rejects(
    verifyInternalAuditServiceToken({
      token: ownerToken,
      body: BODY,
      key: {
        secret: CROSS_DOMAIN_SECRET,
        ordinaryJwtSecret: ORDINARY_SECRET,
        privilegedJwtSecret: PRIVILEGED_SECRET,
      },
      now: new Date('2026-10-03T09:15:10.000Z'),
    }),
  );
  await assert.rejects(
    verifyInternalAlertAckServiceToken({
      token: ownerToken,
      body: BODY,
      key: {
        secret: CROSS_DOMAIN_SECRET,
        ordinaryJwtSecret: ORDINARY_SECRET,
        privilegedJwtSecret: PRIVILEGED_SECRET,
        internalAuditServiceSecret: AUDIT_SECRET,
      },
      now: new Date('2026-10-03T09:15:10.000Z'),
    }),
  );
  await assert.rejects(
    verifyInternalOwnerSessionServiceToken({
      token: auditToken,
      body: BODY,
      key: ownerKey(CROSS_DOMAIN_SECRET),
      now: new Date('2026-10-03T09:15:10.000Z'),
    }),
  );
  await assert.rejects(
    verifyInternalOwnerSessionServiceToken({
      token: ackToken,
      body: BODY,
      key: ownerKey(CROSS_DOMAIN_SECRET),
      now: new Date('2026-10-03T09:15:10.000Z'),
    }),
  );
});

test('internal Owner session token rejects malformed request ids', async () => {
  await assert.rejects(
    signInternalOwnerSessionServiceToken({
      requestId: 'not-a-uuid',
      body: BODY,
      key: ownerKey(),
      now: NOW,
    }),
    /request id/i,
  );
});
