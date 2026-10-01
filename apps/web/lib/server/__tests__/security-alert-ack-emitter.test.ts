import assert from 'node:assert/strict';
import test from 'node:test';

import {
  verifyInternalAlertAckServiceToken,
} from '@emopet/privileged-auth';

import {
  emitSecurityAlertAcknowledgement,
} from '../security-alert-ack-emitter';

const ALERT_ID = '92440000-0000-4000-8000-000000000001';
const OPERATOR_ID = '92440000-0000-4000-8000-000000000002';
const REQUEST_ID = '92440000-0000-4000-8000-000000000003';
const ACK_SECRET = 'k'.repeat(48);
const AUDIT_SECRET = 'a'.repeat(48);
const ORDINARY_SECRET = 'o'.repeat(48);
const PRIVILEGED_SECRET = 'p'.repeat(48);
const NOW = new Date('2026-10-01T21:00:00.000Z');

function env() {
  return {
    NODE_ENV: 'test',
    EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET: ACK_SECRET,
    EMOPET_INTERNAL_AUDIT_SERVICE_SECRET: AUDIT_SECRET,
    JWT_SECRET: ORDINARY_SECRET,
    PRIVILEGED_JWT_SECRET: PRIVILEGED_SECRET,
  };
}

const authorization = {
  status: 'AUTHORIZED' as const,
  subject: OPERATOR_ID,
  role: 'operator' as const,
  action: 'security.incident.coordinate' as const,
};

test('ack emitter derives signed internal identity only from canonical authorization', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const result = await emitSecurityAlertAcknowledgement({
    authorization,
    alertId: ALERT_ID,
    acknowledgedAt: NOW.toISOString(),
  }, {
    env: env(),
    now: () => NOW,
    requestIdFactory: () => REQUEST_ID,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, duplicate: false }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.deepEqual(result, { status: 'ACKNOWLEDGED', duplicate: false });
  assert.equal(capturedUrl, 'http://127.0.0.1:3000/internal/security-alert-ack');
  assert.equal(capturedInit?.method, 'POST');

  const body = String(capturedInit?.body);
  assert.deepEqual(JSON.parse(body), {
    alertId: ALERT_ID,
    acknowledgedAt: NOW.toISOString(),
    subject: OPERATOR_ID,
    role: 'operator',
  });

  const auth = new Headers(capturedInit?.headers).get('authorization');
  assert.ok(auth?.startsWith('Bearer '));
  const verified = await verifyInternalAlertAckServiceToken({
    token: auth.slice(7),
    body,
    key: {
      secret: ACK_SECRET,
      ordinaryJwtSecret: ORDINARY_SECRET,
      privilegedJwtSecret: PRIVILEGED_SECRET,
      internalAuditServiceSecret: AUDIT_SECRET,
    },
    now: new Date('2026-10-01T21:00:10.000Z'),
  });
  assert.equal(verified.requestId, REQUEST_ID);
});

test('ack emitter rejects non-canonical or unsupported authority before transport', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response('{}', { status: 200 });
  };

  for (const authority of [
    { status: 'DENIED', reason: 'not_authorized' as const },
    {
      status: 'AUTHORIZED' as const,
      subject: OPERATOR_ID,
      role: 'support' as const,
      action: 'security.incident.coordinate' as const,
    },
    {
      status: 'AUTHORIZED' as const,
      subject: OPERATOR_ID,
      role: 'operator' as const,
      action: 'security.incident.read' as const,
    },
  ]) {
    assert.deepEqual(
      await emitSecurityAlertAcknowledgement({
        authorization: authority,
        alertId: ALERT_ID,
        acknowledgedAt: NOW.toISOString(),
      }, {
        env: env(),
        now: () => NOW,
        requestIdFactory: () => REQUEST_ID,
        fetchImpl,
      }),
      { status: 'INVALID_AUTHORITY' },
    );
  }

  assert.equal(calls, 0);
});
