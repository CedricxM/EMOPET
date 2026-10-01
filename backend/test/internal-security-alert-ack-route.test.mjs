import assert from 'node:assert/strict';
import test from 'node:test';

import { signInternalAlertAckServiceToken } from '@emopet/privileged-auth';
import { createInternalSecurityAlertAckRoute } from '../dist/api/routes/internal-security-alert-ack.js';

const SECRET = 'k'.repeat(48);
const NOW = new Date('2026-10-01T12:00:00.000Z');
const REQUEST_ID = '92410000-0000-4000-8000-000000000001';
const ALERT_ID = '92410000-0000-4000-8000-000000000002';
const ADMIN_ID = '92410000-0000-4000-8000-000000000003';

function payload(overrides = {}) {
  return {
    alertId: ALERT_ID,
    actorSubject: ADMIN_ID,
    actorRole: 'admin',
    acknowledgedAt: NOW.toISOString(),
    ...overrides,
  };
}

async function requestFor(body, secret = SECRET) {
  const text = JSON.stringify(body);
  const token = await signInternalAlertAckServiceToken({
    requestId: REQUEST_ID,
    body: text,
    key: { secret },
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

test('internal ACK route derives request id from service token and calls bounded repository input', async () => {
  const calls = [];
  const route = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async (input) => {
      calls.push(input);
      return {
        status: 'ACKNOWLEDGED',
        alertId: ALERT_ID,
        requestId: REQUEST_ID,
        acknowledgedAt: NOW.toISOString(),
      };
    },
  });

  const response = await route.fetch(await requestFor(payload()));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ok: true,
    acknowledged: true,
    duplicate: false,
  });
  assert.deepEqual(calls, [{
    requestId: REQUEST_ID,
    ...payload(),
  }]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('idempotent replay and conflict map to stable transport results', async () => {
  const duplicate = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async () => ({
      status: 'DEDUPED',
      alertId: ALERT_ID,
      requestId: REQUEST_ID,
      acknowledgedAt: NOW.toISOString(),
    }),
  });
  let response = await duplicate.fetch(await requestFor(payload()));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).duplicate, true);

  const conflict = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async () => ({
      status: 'ACK_CONFLICT',
      alertId: ALERT_ID,
      requestId: REQUEST_ID,
    }),
  });
  response = await conflict.fetch(await requestFor(payload()));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'security_alert_ack_conflict',
  });
});

test('tampered body, wrong service secret and extra material fail before repository call', async () => {
  let calls = 0;
  const route = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async () => {
      calls += 1;
      return {
        status: 'ACKNOWLEDGED',
        alertId: ALERT_ID,
        requestId: REQUEST_ID,
        acknowledgedAt: NOW.toISOString(),
      };
    },
  });

  const signed = await requestFor(payload());
  const originalBody = await signed.text();
  const auth = signed.headers.get('authorization');
  const tampered = originalBody.replace('"admin"', '"operator"');

  let response = await route.fetch(new Request('http://internal.test/', {
    method: 'POST',
    headers: {
      authorization: auth,
      'content-type': 'application/json',
    },
    body: tampered,
  }));
  assert.equal(response.status, 401);

  response = await route.fetch(await requestFor(payload(), 'x'.repeat(48)));
  assert.equal(response.status, 401);

  response = await route.fetch(await requestFor({
    ...payload(),
    note: 'must never enter acknowledgement authority',
  }));
  assert.equal(response.status, 400);

  assert.equal(calls, 0);
});

test('unknown alert and unavailable database remain explicit', async () => {
  const unknown = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async () => ({
      status: 'UNKNOWN_ALERT',
      alertId: ALERT_ID,
      requestId: REQUEST_ID,
    }),
  });
  assert.equal(
    (await unknown.fetch(await requestFor(payload()))).status,
    404,
  );

  const unavailable = createInternalSecurityAlertAckRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    acknowledge: async () => ({
      status: 'DATABASE_UNAVAILABLE',
      alertId: ALERT_ID,
      requestId: REQUEST_ID,
    }),
  });
  assert.equal(
    (await unavailable.fetch(await requestFor(payload()))).status,
    503,
  );
});
