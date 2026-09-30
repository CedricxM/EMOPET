import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertInternalAuditServiceKeyConfig,
  signInternalAuditServiceToken,
  verifyInternalAuditServiceToken,
} from '../dist/index.js';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const SECRET = 'a'.repeat(48);
const OTHER_SECRET = 'b'.repeat(48);
const NOW = new Date('2026-09-30T16:00:00.000Z');
const BODY = JSON.stringify({
  decision: { status: 'DENIED', reason: 'invalid_token' },
  action: 'admin.data.read',
  target: { scope: 'system', ref: null },
  occurredAt: '2026-09-30T16:00:00.000Z',
});

test('internal audit service token binds event id and exact request body', async () => {
  const token = await signInternalAuditServiceToken({
    eventId: EVENT_ID,
    body: BODY,
    key: {
      secret: SECRET,
      ordinaryJwtSecret: OTHER_SECRET,
      privilegedJwtSecret: 'c'.repeat(48),
    },
    now: NOW,
  });

  const verified = await verifyInternalAuditServiceToken({
    token,
    body: BODY,
    key: {
      secret: SECRET,
      ordinaryJwtSecret: OTHER_SECRET,
      privilegedJwtSecret: 'c'.repeat(48),
    },
    now: new Date('2026-09-30T16:00:10.000Z'),
  });

  assert.equal(verified.eventId, EVENT_ID);
  assert.match(verified.bodySha256, /^[0-9a-f]{64}$/);
  assert.equal(verified.expiresAt - verified.issuedAt, 30);
});

test('internal audit token rejects body tampering and expiry', async () => {
  const token = await signInternalAuditServiceToken({
    eventId: EVENT_ID,
    body: BODY,
    key: { secret: SECRET },
    now: NOW,
  });

  await assert.rejects(
    verifyInternalAuditServiceToken({
      token,
      body: BODY.replace('admin.data.read', 'moderation.queue.read'),
      key: { secret: SECRET },
      now: new Date('2026-09-30T16:00:10.000Z'),
    }),
    /digest mismatch/i,
  );

  await assert.rejects(
    verifyInternalAuditServiceToken({
      token,
      body: BODY,
      key: { secret: SECRET },
      now: new Date('2026-09-30T16:00:31.000Z'),
    }),
  );
});

test('internal audit secret must be strong and separate from user JWT secrets', () => {
  assert.throws(
    () => assertInternalAuditServiceKeyConfig({ secret: 'short' }),
    /32 characters/i,
  );

  assert.throws(
    () => assertInternalAuditServiceKeyConfig({
      secret: SECRET,
      ordinaryJwtSecret: SECRET,
    }),
    /distinct/i,
  );

  assert.throws(
    () => assertInternalAuditServiceKeyConfig({
      secret: SECRET,
      privilegedJwtSecret: SECRET,
    }),
    /distinct/i,
  );

  assert.doesNotThrow(() => assertInternalAuditServiceKeyConfig({
    secret: SECRET,
    ordinaryJwtSecret: OTHER_SECRET,
    privilegedJwtSecret: 'c'.repeat(48),
  }));
});
