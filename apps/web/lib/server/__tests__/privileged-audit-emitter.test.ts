import assert from 'node:assert/strict';
import test from 'node:test';

import { emitPrivilegedAuditDecision } from '../privileged-audit-emitter';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';
const SECRET = 's'.repeat(48);
const NOW = new Date('2026-09-30T16:10:00.000Z');

function env() {
  return {
    NODE_ENV: 'test',
    EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    EMOPET_INTERNAL_AUDIT_SERVICE_SECRET: SECRET,
    JWT_SECRET: 'j'.repeat(48),
    PRIVILEGED_JWT_SECRET: 'p'.repeat(48),
  } as NodeJS.ProcessEnv;
}

test('unavailable authorization never fabricates or emits an audit fact', async () => {
  let calls = 0;
  const result = await emitPrivilegedAuditDecision({
    decision: { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  }, {
    env: env(),
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 201 });
    },
  });

  assert.deepEqual(result, {
    status: 'NOT_EMITTED',
    reason: 'authority_unavailable',
  });
  assert.equal(calls, 0);
});

test('authorized decision emits only bounded canonical decision material', async () => {
  let capturedBody = '';
  let capturedAuth = '';

  const result = await emitPrivilegedAuditDecision({
    decision: {
      status: 'AUTHORIZED',
      subject: ADMIN_ID,
      role: 'admin',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  }, {
    env: env(),
    now: () => NOW,
    eventIdFactory: () => EVENT_ID,
    fetchImpl: async (_url, init) => {
      capturedBody = String(init?.body ?? '');
      capturedAuth = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify({ ok: true, stored: true, duplicate: false }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.deepEqual(result, { status: 'EMITTED', duplicate: false });
  assert.match(capturedAuth, /^Bearer [^.]+\.[^.]+\.[^.]+$/);

  const payload = JSON.parse(capturedBody);
  assert.deepEqual(payload, {
    decision: {
      status: 'AUTHORIZED',
      subject: ADMIN_ID,
      role: 'admin',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  });

  for (const forbidden of [
    'cookie',
    'authorization',
    'email',
    'user-agent',
    'ip',
    'token',
    'session',
  ]) {
    assert.doesNotMatch(capturedBody.toLowerCase(), new RegExp(forbidden));
  }
});

test('verified denial preserves bounded actor while anonymous denial stays anonymous', async () => {
  const bodies: unknown[] = [];
  const fetchImpl = async (_url: URL | RequestInfo, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')));
    return new Response(JSON.stringify({ ok: true, stored: true, duplicate: false }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };

  await emitPrivilegedAuditDecision({
    decision: {
      status: 'DENIED',
      reason: 'not_authorized',
      subject: SUPPORT_ID,
      role: 'support',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  }, {
    env: env(),
    now: () => NOW,
    eventIdFactory: () => EVENT_ID,
    fetchImpl,
  });

  await emitPrivilegedAuditDecision({
    decision: { status: 'DENIED', reason: 'missing_session' },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  }, {
    env: env(),
    now: () => NOW,
    eventIdFactory: () => '44444444-4444-4444-8444-444444444444',
    fetchImpl,
  });

  assert.deepEqual((bodies[0] as any).decision, {
    status: 'DENIED',
    reason: 'action_not_allowed',
    subject: SUPPORT_ID,
    role: 'support',
    action: 'admin.data.read',
  });
  assert.deepEqual((bodies[1] as any).decision, {
    status: 'DENIED',
    reason: 'invalid_token',
  });
});

test('transport retry reuses the exact same service token and body', async () => {
  const calls: Array<{ auth: string; body: string }> = [];
  let attempt = 0;

  const result = await emitPrivilegedAuditDecision({
    decision: {
      status: 'AUTHORIZED',
      subject: ADMIN_ID,
      role: 'admin',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  }, {
    env: env(),
    now: () => NOW,
    eventIdFactory: () => EVENT_ID,
    fetchImpl: async (_url, init) => {
      calls.push({
        auth: new Headers(init?.headers).get('authorization') ?? '',
        body: String(init?.body ?? ''),
      });
      attempt += 1;
      if (attempt === 1) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({ ok: true, stored: true, duplicate: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.deepEqual(result, { status: 'EMITTED', duplicate: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.auth, calls[1]?.auth);
  assert.equal(calls[0]?.body, calls[1]?.body);
});

test('missing or unsafe runtime configuration fails closed without network I/O', async () => {
  let calls = 0;
  const decision = {
    status: 'AUTHORIZED' as const,
    subject: ADMIN_ID,
    role: 'admin' as const,
    action: 'admin.data.read' as const,
  };

  for (const badEnv of [
    { NODE_ENV: 'test' },
    {
      NODE_ENV: 'production',
      EMOPET_INTERNAL_BACKEND_URL: 'http://backend.internal:3000',
      EMOPET_INTERNAL_AUDIT_SERVICE_SECRET: SECRET,
    },
    {
      NODE_ENV: 'test',
      EMOPET_INTERNAL_BACKEND_URL: 'https://user:pass@example.test/',
      EMOPET_INTERNAL_AUDIT_SERVICE_SECRET: SECRET,
    },
  ]) {
    const result = await emitPrivilegedAuditDecision({
      decision,
      action: 'admin.data.read',
      target: { scope: 'system', ref: null },
      occurredAt: NOW.toISOString(),
    }, {
      env: badEnv as NodeJS.ProcessEnv,
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 201 });
      },
    });

    assert.deepEqual(result, {
      status: 'FAILED',
      reason: 'configuration_unavailable',
    });
  }

  assert.equal(calls, 0);
});
