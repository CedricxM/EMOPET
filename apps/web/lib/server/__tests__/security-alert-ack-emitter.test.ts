import assert from 'node:assert/strict';
import test from 'node:test';

import { emitSecurityAlertAcknowledgement } from '../security-alert-ack-emitter';

const ALERT_ID = '92420000-0000-4000-8000-000000000001';
const ADMIN_ID = '92420000-0000-4000-8000-000000000002';
const REQUEST_ID = '92420000-0000-4000-8000-000000000003';
const NOW = new Date('2026-10-01T13:00:00.000Z');
const ACK_SECRET = 'a'.repeat(48);

function env() {
  return {
    NODE_ENV: 'test',
    EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET: ACK_SECRET,
    EMOPET_INTERNAL_AUDIT_SERVICE_SECRET: 'u'.repeat(48),
    JWT_SECRET: 'j'.repeat(48),
    PRIVILEGED_JWT_SECRET: 'p'.repeat(48),
  } as NodeJS.ProcessEnv;
}

function input() {
  return {
    alertId: ALERT_ID,
    actorSubject: ADMIN_ID,
    actorRole: 'admin' as const,
    acknowledgedAt: NOW.toISOString(),
  };
}

test('ACK emitter sends only verified actor identity and bounded acknowledgement fields', async () => {
  let capturedBody = '';
  let capturedAuth = '';
  let capturedUrl = '';

  const result = await emitSecurityAlertAcknowledgement(input(), {
    env: env(),
    now: () => NOW,
    requestIdFactory: () => REQUEST_ID,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      capturedAuth = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify({
        ok: true,
        acknowledged: true,
        duplicate: false,
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.deepEqual(result, { status: 'ACKNOWLEDGED', duplicate: false });
  assert.equal(
    capturedUrl,
    'http://127.0.0.1:3000/internal/security-alert-ack',
  );
  assert.match(capturedAuth, /^Bearer [^.]+\.[^.]+\.[^.]+$/);
  assert.deepEqual(JSON.parse(capturedBody), input());

  for (const forbidden of [
    'destination',
    'provider',
    'email',
    'phone',
    'note',
    'message',
    'cookie',
    'session',
  ]) {
    assert.doesNotMatch(capturedBody.toLowerCase(), new RegExp(forbidden));
  }
});

test('transport retry reuses one request id, service token and exact body', async () => {
  const calls: Array<{ auth: string; body: string }> = [];
  let attempt = 0;

  const result = await emitSecurityAlertAcknowledgement(input(), {
    env: env(),
    now: () => NOW,
    requestIdFactory: () => REQUEST_ID,
    fetchImpl: async (_url, init) => {
      calls.push({
        auth: new Headers(init?.headers).get('authorization') ?? '',
        body: String(init?.body ?? ''),
      });
      attempt += 1;
      if (attempt === 1) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({
        ok: true,
        acknowledged: true,
        duplicate: true,
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.deepEqual(result, { status: 'ACKNOWLEDGED', duplicate: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
});

test('not-found and conflicting acknowledgements are not retried or flattened', async () => {
  let calls = 0;
  let result = await emitSecurityAlertAcknowledgement(input(), {
    env: env(),
    now: () => NOW,
    requestIdFactory: () => REQUEST_ID,
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 404 });
    },
  });
  assert.deepEqual(result, { status: 'NOT_FOUND' });
  assert.equal(calls, 1);

  calls = 0;
  result = await emitSecurityAlertAcknowledgement(input(), {
    env: env(),
    now: () => NOW,
    requestIdFactory: () => REQUEST_ID,
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 409 });
    },
  });
  assert.deepEqual(result, { status: 'CONFLICT' });
  assert.equal(calls, 1);
});

test('missing, unsafe or secret-reuse configuration fails without network I/O', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(null, { status: 201 });
  };

  for (const badEnv of [
    { NODE_ENV: 'test' },
    {
      NODE_ENV: 'production',
      EMOPET_INTERNAL_BACKEND_URL: 'http://backend.internal:3000',
      EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET: ACK_SECRET,
    },
    {
      ...env(),
      EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET: 'u'.repeat(48),
    },
    {
      ...env(),
      EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET: 'p'.repeat(48),
    },
  ]) {
    assert.deepEqual(
      await emitSecurityAlertAcknowledgement(input(), {
        env: badEnv as NodeJS.ProcessEnv,
        now: () => NOW,
        requestIdFactory: () => REQUEST_ID,
        fetchImpl,
      }),
      { status: 'FAILED', reason: 'configuration_unavailable' },
    );
  }

  assert.equal(calls, 0);
});
