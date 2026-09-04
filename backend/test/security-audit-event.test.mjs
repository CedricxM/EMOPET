import test from 'node:test';
import assert from 'node:assert/strict';

const {
  SECURITY_AUDIT_SCHEMA_VERSION,
  parseSecurityAuditEvent,
} = await import('../dist/api/security/security-audit-event.js');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const GUARDIAN_ID = '22222222-2222-4222-8222-222222222222';

function validEvent() {
  return {
    eventType: 'privileged_authority_decision',
    occurredAt: '2026-09-04T09:00:00Z',
    actor: {
      kind: 'privileged_human',
      subject: ADMIN_ID,
      role: 'admin',
    },
    action: 'account.read_limited',
    target: {
      scope: 'account',
      ref: GUARDIAN_ID,
    },
    outcome: 'allowed',
    reason: 'allowed',
  };
}

test('audit event canonicalizes a valid bounded privileged access event', () => {
  assert.deepEqual(parseSecurityAuditEvent(validEvent()), {
    schemaVersion: SECURITY_AUDIT_SCHEMA_VERSION,
    eventType: 'privileged_authority_decision',
    occurredAt: '2026-09-04T09:00:00.000Z',
    actor: {
      kind: 'privileged_human',
      subject: ADMIN_ID,
      role: 'admin',
    },
    action: 'account.read_limited',
    target: {
      scope: 'account',
      ref: GUARDIAN_ID,
    },
    outcome: 'allowed',
    reason: 'allowed',
  });
});

test('audit event rejects arbitrary metadata, notes, secrets and raw payload fields', () => {
  for (const forbidden of [
    { metadata: { ip: '127.0.0.1' } },
    { note: 'free-form operator note' },
    { token: 'secret-token-value' },
    { password: 'password-value' },
    { rawBody: { email: 'person@example.invalid' } },
  ]) {
    assert.equal(parseSecurityAuditEvent({ ...validEvent(), ...forbidden }), null);
  }
});

test('audit event rejects invalid or non-UTC timestamps', () => {
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), occurredAt: 'not-a-date' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), occurredAt: '2026-09-04T11:00:00+02:00' }), null);
});

test('audit event rejects unknown actions, outcomes, reasons and event types', () => {
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), action: '*' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), action: 'account.export_all' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), outcome: 'maybe' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), reason: 'because_i_said_so' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), eventType: 'anything' }), null);
});

test('audit event rejects semantically incoherent outcome and reason pairs', () => {
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), outcome: 'allowed', reason: 'mfa_required' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), outcome: 'denied', reason: 'allowed' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), outcome: 'error', reason: 'action_not_allowed' }), null);
  assert.equal(parseSecurityAuditEvent({ ...validEvent(), outcome: 'denied', reason: 'internal_error' }), null);

  assert.notEqual(parseSecurityAuditEvent({ ...validEvent(), outcome: 'error', reason: 'internal_error' }), null);
  assert.notEqual(parseSecurityAuditEvent({ ...validEvent(), outcome: 'denied', reason: 'mfa_required' }), null);
});

test('audit event rejects malformed actors and role substitution', () => {
  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'privileged_human', subject: 'not-a-uuid', role: 'admin' },
  }), null);

  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'privileged_human', subject: ADMIN_ID, role: 'guardian' },
  }), null);

  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'machine', subject: 'worker', role: null },
  }), null);
});

test('audit event supports bounded guardian, machine and anonymous actors without free-form identity data', () => {
  const guardian = parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'guardian', subject: GUARDIAN_ID, role: null },
    outcome: 'denied',
    reason: 'action_not_allowed',
  });
  assert.equal(guardian?.actor.kind, 'guardian');

  const machine = parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'machine', subject: 'service:security-worker', role: null },
    outcome: 'denied',
    reason: 'machine_principal_not_supported',
  });
  assert.equal(machine?.actor.kind, 'machine');

  const anonymous = parseSecurityAuditEvent({
    ...validEvent(),
    actor: { kind: 'anonymous', subject: null, role: null },
    outcome: 'denied',
    reason: 'invalid_principal',
  });
  assert.equal(anonymous?.actor.kind, 'anonymous');
});

test('audit target references are bounded and exclude email-like or free-form identifiers', () => {
  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    target: { scope: 'account', ref: 'person@example.invalid' },
  }), null);

  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    target: { scope: 'account', ref: 'contains spaces' },
  }), null);

  assert.equal(parseSecurityAuditEvent({
    ...validEvent(),
    target: { scope: 'system', ref: 'unexpected-ref' },
  }), null);

  assert.notEqual(parseSecurityAuditEvent({
    ...validEvent(),
    target: { scope: 'system', ref: null },
  }), null);
});
