import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertInternalAlertAckServiceKeyConfig,
  signInternalAlertAckServiceToken,
  verifyInternalAlertAckServiceToken,
  signInternalAuditServiceToken,
  verifyInternalAuditServiceToken,
} from '../dist/index.js';

const REQUEST_ID = '92400000-0000-4000-8000-000000000001';
const ACK_SECRET = 'k'.repeat(48);
const AUDIT_SECRET = 'a'.repeat(48);
const ORDINARY_SECRET = 'o'.repeat(48);
const PRIVILEGED_SECRET = 'p'.repeat(48);
const SHARED_DOMAIN_TEST_SECRET = 's'.repeat(48);
const NOW = new Date('2026-10-01T20:00:00.000Z');
const BODY = JSON.stringify({
  alertId: '92400000-0000-4000-8000-000000000099',
  acknowledgedAt: '2026-10-01T20:00:00.000Z',
  subject: '11111111-1111-4111-8111-111111111111',
  role: 'operator',
});

function ackKey(secret = ACK_SECRET) {
  return {
    secret,
    ordinaryJwtSecret: ORDINARY_SECRET,
    privilegedJwtSecret: PRIVILEGED_SECRET,
    internalAuditServiceSecret: AUDIT_SECRET,
  };
}

test('internal acknowledgement token binds request id and exact request body', async () => {
  const token = await signInternalAlertAckServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: ackKey(),
    now: NOW,
  });

  const verified = await verifyInternalAlertAckServiceToken({
    token,
    body: BODY,
    key: ackKey(),
    now: new Date('2026-10-01T20:00:10.000Z'),
  });

  assert.equal(verified.requestId, REQUEST_ID);
  assert.match(verified.bodySha256, /^[0-9a-f]{64}$/);
  assert.equal(verified.expiresAt - verified.issuedAt, 30);
});

test('internal acknowledgement token rejects body tampering and expiry', async () => {
  const token = await signInternalAlertAckServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: ackKey(),
    now: NOW,
  });

  await assert.rejects(
    verifyInternalAlertAckServiceToken({
      token,
      body: BODY.replace('"operator"', '"admin"'),
      key: ackKey(),
      now: new Date('2026-10-01T20:00:10.000Z'),
    }),
    /digest mismatch/i,
  );

  await assert.rejects(
    verifyInternalAlertAckServiceToken({
      token,
      body: BODY,
      key: ackKey(),
      now: new Date('2026-10-01T20:00:31.000Z'),
    }),
  );
});

test('acknowledgement and audit service tokens cannot cross authorization domains', async () => {
  const ackToken = await signInternalAlertAckServiceToken({
    requestId: REQUEST_ID,
    body: BODY,
    key: {
      secret: SHARED_DOMAIN_TEST_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
      privilegedJwtSecret: PRIVILEGED_SECRET,
      internalAuditServiceSecret: AUDIT_SECRET,
    },
    now: NOW,
  });

  const auditToken = await signInternalAuditServiceToken({
    eventId: REQUEST_ID,
    body: BODY,
    key: {
      secret: SHARED_DOMAIN_TEST_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
      privilegedJwtSecret: PRIVILEGED_SECRET,
    },
    now: NOW,
  });

  await assert.rejects(
    verifyInternalAuditServiceToken({
      token: ackToken,
      body: BODY,
      key: {
        secret: SHARED_DOMAIN_TEST_SECRET,
        ordinaryJwtSecret: ORDINARY_SECRET,
        privilegedJwtSecret: PRIVILEGED_SECRET,
      },
      now: new Date('2026-10-01T20:00:10.000Z'),
    }),
  );

  await assert.rejects(
    verifyInternalAlertAckServiceToken({
      token: auditToken,
      body: BODY,
      key: {
        secret: SHARED_DOMAIN_TEST_SECRET,
        ordinaryJwtSecret: ORDINARY_SECRET,
        privilegedJwtSecret: PRIVILEGED_SECRET,
        internalAuditServiceSecret: AUDIT_SECRET,
      },
      now: new Date('2026-10-01T20:00:10.000Z'),
    }),
  );
});

test('internal acknowledgement secret is strong and separate from JWT/audit secrets', () => {
  assert.throws(
    () => assertInternalAlertAckServiceKeyConfig(ackKey('short')),
    /32 characters/i,
  );

  for (const secret of [ORDINARY_SECRET, PRIVILEGED_SECRET, AUDIT_SECRET]) {
    assert.throws(
      () => assertInternalAlertAckServiceKeyConfig(ackKey(secret)),
      /distinct/i,
    );
  }

  assert.doesNotThrow(() => assertInternalAlertAckServiceKeyConfig(ackKey()));
});
