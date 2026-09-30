import assert from 'node:assert/strict';
import test from 'node:test';

import { signInternalAuditServiceToken } from '@emopet/privileged-auth';
import { createInternalSecurityAuditRoute } from '../dist/api/routes/internal-security-audit.js';

const SECRET = 's'.repeat(48);
const NOW = new Date('2026-09-30T16:20:00.000Z');
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

function payload() {
  return {
    decision: {
      status: 'AUTHORIZED',
      subject: ADMIN_ID,
      role: 'admin',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  };
}

async function requestFor(body, eventId = EVENT_ID, secret = SECRET) {
  const text = JSON.stringify(body);
  const token = await signInternalAuditServiceToken({
    eventId,
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

test('internal route verifies service identity, recomposes canonical event and persists once', async () => {
  const calls = [];
  const route = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async (event, eventId) => {
      calls.push({ event, eventId });
      return {
        ok: true,
        id: eventId,
        storedAt: NOW.toISOString(),
        duplicate: false,
      };
    },
  });

  const response = await route.fetch(await requestFor(payload()));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ok: true,
    stored: true,
    duplicate: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].eventId, EVENT_ID);
  assert.deepEqual(calls[0].event, {
    schemaVersion: 'security-audit-v1',
    eventType: 'privileged_authority_decision',
    occurredAt: NOW.toISOString(),
    actor: {
      kind: 'privileged_human',
      subject: ADMIN_ID,
      role: 'admin',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    outcome: 'allowed',
    reason: 'allowed',
  });
});

test('duplicate idempotent persistence is acknowledged without creating a second fact', async () => {
  const route = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async (_event, eventId) => ({
      ok: true,
      id: eventId,
      storedAt: NOW.toISOString(),
      duplicate: true,
    }),
  });

  const response = await route.fetch(await requestFor(payload()));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    stored: true,
    duplicate: true,
  });
});

test('body tampering, wrong service secret and unavailable authority fail closed', async () => {
  let persistCalls = 0;
  const route = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async (_event, eventId) => {
      persistCalls += 1;
      return {
        ok: true,
        id: eventId,
        storedAt: NOW.toISOString(),
        duplicate: false,
      };
    },
  });

  const signed = await requestFor(payload());
  const signedBody = await signed.text();
  const auth = signed.headers.get('authorization');
  const tampered = signedBody.replace('admin.data.read', 'moderation.queue.read');

  const tamperedResponse = await route.fetch(new Request('http://internal.test/', {
    method: 'POST',
    headers: {
      authorization: auth,
      'content-type': 'application/json',
    },
    body: tampered,
  }));
  assert.equal(tamperedResponse.status, 401);

  const wrongSecretResponse = await route.fetch(
    await requestFor(payload(), EVENT_ID, 'x'.repeat(48)),
  );
  assert.equal(wrongSecretResponse.status, 401);

  const unavailableBody = {
    decision: { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  };
  const unavailableResponse = await route.fetch(await requestFor(unavailableBody));
  assert.equal(unavailableResponse.status, 400);

  assert.equal(persistCalls, 0);
});

test('idempotency conflict and sink failure preserve fail-closed transport semantics', async () => {
  const conflict = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async () => ({
      ok: false,
      error: 'IDEMPOTENCY_CONFLICT',
      retryable: false,
    }),
  });
  assert.equal((await conflict.fetch(await requestFor(payload()))).status, 409);

  const unavailable = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async () => ({
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    }),
  });
  assert.equal((await unavailable.fetch(await requestFor(payload()))).status, 503);
});

test('extra top-level material is rejected before persistence', async () => {
  let calls = 0;
  const route = createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
    persist: async (_event, eventId) => {
      calls += 1;
      return {
        ok: true,
        id: eventId,
        storedAt: NOW.toISOString(),
        duplicate: false,
      };
    },
  });

  const response = await route.fetch(await requestFor({
    ...payload(),
    email: 'must-not-enter-audit@example.invalid',
  }));

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});
