import test from 'node:test';
import assert from 'node:assert/strict';

const {
  composePrivilegedAuditEvent,
} = await import('../dist/api/security/security-audit-composition.js');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';
const GUARDIAN_ID = '33333333-3333-4333-8333-333333333333';
const ACTION = 'account.read_limited';
const OCCURRED_AT = '2026-09-04T10:00:00Z';

function target() {
  return { scope: 'account', ref: GUARDIAN_ID };
}

function authorizedDecision() {
  return {
    status: 'AUTHORIZED',
    subject: ADMIN_ID,
    role: 'admin',
    action: ACTION,
  };
}

test('authorized verified human composes into a canonical allowed audit event', () => {
  assert.deepEqual(
    composePrivilegedAuditEvent(authorizedDecision(), ACTION, target(), OCCURRED_AT),
    {
      status: 'COMPOSED',
      event: {
        schemaVersion: 'security-audit-v1',
        eventType: 'privileged_authority_decision',
        occurredAt: '2026-09-04T10:00:00.000Z',
        actor: {
          kind: 'privileged_human',
          subject: ADMIN_ID,
          role: 'admin',
        },
        action: ACTION,
        target: target(),
        outcome: 'allowed',
        reason: 'allowed',
      },
    },
  );
});

test('authenticated RBAC denial preserves verified actor identity and exact action', () => {
  assert.deepEqual(
    composePrivilegedAuditEvent({
      status: 'DENIED',
      reason: 'action_not_allowed',
      subject: SUPPORT_ID,
      role: 'support',
      action: ACTION,
    }, ACTION, target(), OCCURRED_AT),
    {
      status: 'COMPOSED',
      event: {
        schemaVersion: 'security-audit-v1',
        eventType: 'privileged_authority_decision',
        occurredAt: '2026-09-04T10:00:00.000Z',
        actor: {
          kind: 'privileged_human',
          subject: SUPPORT_ID,
          role: 'support',
        },
        action: ACTION,
        target: target(),
        outcome: 'denied',
        reason: 'action_not_allowed',
      },
    },
  );
});

test('invalid token denial remains anonymous while preserving the separately requested finite action', () => {
  const result = composePrivilegedAuditEvent(
    { status: 'DENIED', reason: 'invalid_token' },
    ACTION,
    target(),
    OCCURRED_AT,
  );

  assert.equal(result.status, 'COMPOSED');
  assert.deepEqual(result.event?.actor, { kind: 'anonymous', subject: null, role: null });
  assert.equal(result.event?.action, ACTION);
  assert.equal(result.event?.outcome, 'denied');
  assert.equal(result.event?.reason, 'invalid_principal');
});

test('requested action must be canonical and must match every verified decision action', () => {
  assert.deepEqual(
    composePrivilegedAuditEvent(authorizedDecision(), '*', target(), OCCURRED_AT),
    { status: 'INVALID_ACTION', event: null },
  );

  assert.deepEqual(
    composePrivilegedAuditEvent(
      { ...authorizedDecision(), action: 'dog.read_limited' },
      ACTION,
      target(),
      OCCURRED_AT,
    ),
    { status: 'INVALID_DECISION', event: null },
  );

  assert.deepEqual(
    composePrivilegedAuditEvent({
      status: 'DENIED',
      reason: 'action_not_allowed',
      subject: SUPPORT_ID,
      role: 'support',
      action: 'dog.read_limited',
    }, ACTION, target(), OCCURRED_AT),
    { status: 'INVALID_DECISION', event: null },
  );
});

test('unavailable, invalid-action, malformed and extra-field authority fails closed', () => {
  for (const decision of [
    { status: 'UNAVAILABLE', reason: 'verifier_unavailable' },
    { status: 'DENIED', reason: 'invalid_action' },
    { status: 'DENIED', reason: 'not_authorized' },
    { status: 'AUTHORIZED', subject: ADMIN_ID, role: 'guardian', action: ACTION },
    { ...authorizedDecision(), token: 'must-never-enter-audit-composition' },
    { status: 'DENIED', reason: 'invalid_token', token: 'must-never-enter-audit-composition' },
  ]) {
    assert.deepEqual(
      composePrivilegedAuditEvent(decision, ACTION, target(), OCCURRED_AT),
      { status: 'INVALID_DECISION', event: null },
    );
  }
});

test('canonical audit parser blocks malformed identities, unsafe targets and non-UTC timestamps', () => {
  assert.deepEqual(
    composePrivilegedAuditEvent(
      { ...authorizedDecision(), subject: 'not-a-uuid' },
      ACTION,
      target(),
      OCCURRED_AT,
    ),
    { status: 'INVALID_EVENT', event: null },
  );

  for (const unsafeTarget of [
    { scope: 'account', ref: 'person@example.invalid' },
    { scope: 'account', ref: 'contains spaces' },
    { scope: 'system', ref: 'unexpected-ref' },
    { scope: 'account', ref: GUARDIAN_ID, email: 'person@example.invalid' },
  ]) {
    assert.deepEqual(
      composePrivilegedAuditEvent(authorizedDecision(), ACTION, unsafeTarget, OCCURRED_AT),
      { status: 'INVALID_EVENT', event: null },
    );
  }

  assert.deepEqual(
    composePrivilegedAuditEvent(authorizedDecision(), ACTION, target(), '2026-09-04T12:00:00+02:00'),
    { status: 'INVALID_EVENT', event: null },
  );
});

test('composition is deterministic and reads no implicit clock', () => {
  const first = composePrivilegedAuditEvent(authorizedDecision(), ACTION, target(), OCCURRED_AT);
  const second = composePrivilegedAuditEvent(authorizedDecision(), ACTION, target(), OCCURRED_AT);
  assert.deepEqual(first, second);
});
