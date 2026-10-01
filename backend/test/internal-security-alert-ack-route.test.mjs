import assert from 'node:assert/strict';
import test from 'node:test';

import {
  signInternalAlertAckServiceToken,
} from '@emopet/privileged-auth';
import {
  createInternalSecurityAlertAckRoute,
} from '../dist/api/routes/internal-security-alert-ack.js';

const SECRET = 'k'.repeat(48);
const AUDIT_SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-01T20:30:00.000Z');
const REQUEST_ID = '92420000-0000-4000-8000-000000000001';
const ALERT_ID = '92420000-0000-4000-8000-000000000002';
const OPERATOR_ID = '92420000-0000-4000-8000-000000000003';

function key(secret = SECRET) {
  return {
    secret,
    ordinaryJwtSecret: 'o'.repeat(48),
    privilegedJwtSecret: 'p'.repeat(48),
    internalAuditServiceSecret: AUDIT_SECRET,
  };
}

function payload(extra = {}) {
  return {
    alertId: ALERT_ID,
    acknowledgedAt: NOW.toISOString(),
    subject: OPERATOR_ID,
    role: 'operator',
    ...extra,
  };
}

async function requestFor(body, requestId = REQUEST_ID, secret = SECRET) {
  const text = JSON.stringify(body);
  const token = await signInternalAlertAckServiceToken({
    requestId,
    body: text,
    key: key(secret),
    now: NOW,
  });

  return new Request('http://internal.test/', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: text,
  });
}

function success(status = 'ACKNOWLEDGED') {
  return {
    status,
    alertId: ALERT_ID,
    acknowledgedAt: NOW.toISOString(),
    acknowledgedBySubject: OPERATOR_ID,
    acknowledgedByRole: 'operator',
    auditEventId: REQUEST_ID,
  };
}

test('internal acknowledgement route verifies service token and forwards its request id', async () => {
  const calls = [];
  const route = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => key(),
    acknowledge: async (input) => {
      calls.push(input);
      return success();
    },
  });

  const response = await route.fetch(await requestFor(payload()));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true, duplicate: false });
  assert.deepEqual(calls, [{
    requestId: REQUEST_ID,
    alertId: ALERT_ID,
    acknowledgedAt: NOW.toISOString(),
    subject: OPERATOR_ID,
    role: 'operator',
  }]);
});

test('duplicate semantic acknowledgement is returned as an idempotent success', async () => {
  const route = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => key(),
    acknowledge: async () => success('DUPLICATE'),
  });

  const response = await route.fetch(await requestFor(payload()));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, duplicate: true });
});

test('tampering, wrong secret and extra signed fields fail closed before persistence', async () => {
  let calls = 0;
  const route = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => key(),
    acknowledge: async () => {
      calls += 1;
      return success();
    },
  });

  const signed = await requestFor(payload());
  const signedBody = await signed.text();
  const auth = signed.headers.get('authorization');

  const tampered = signedBody.replace('"operator"', '"admin"');
  assert.equal((await route.fetch(new Request('http://internal.test/', {
    method: 'POST',
    headers: {
      authorization: auth,
      'content-type': 'application/json',
    },
    body: tampered,
  }))).status, 401);

  assert.equal(
    (await route.fetch(await requestFor(payload(), REQUEST_ID, 'x'.repeat(48)))).status,
    401,
  );

  assert.equal(
    (await route.fetch(await requestFor({
      ...payload(),
      destination: 'must-not-enter@example.invalid',
    }))).status,
    400,
  );

  assert.equal(calls, 0);
});

test('repository outcomes map to bounded HTTP statuses', async () => {
  const cases = [
    ['UNKNOWN_ALERT', 404],
    ['CONFLICT', 409],
    ['AUDIT_CONFLICT', 409],
    ['INVALID_INPUT', 400],
    ['INVALID_TIMESTAMP', 400],
    ['DATABASE_UNAVAILABLE', 503],
  ];

  for (const [status, expected] of cases) {
    const route = createInternalSecurityAlertAckRoute({
      now: () => NOW,
      keyProvider: () => key(),
      acknowledge: async () => ({
        status,
        alertId: null,
        acknowledgedAt: null,
        acknowledgedBySubject: null,
        acknowledgedByRole: null,
        auditEventId: null,
      }),
    });
    assert.equal(
      (await route.fetch(await requestFor(payload()))).status,
      expected,
      status,
    );
  }
});
