import test from 'node:test';
import assert from 'node:assert/strict';

const { evaluateSecurityAnomalies } = await import('../dist/api/security/security-anomaly-detection.js');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const SUPPORT_ID = '22222222-2222-4222-8222-222222222222';

function policy() {
  return {
    repeatedDenials: {
      enabled: true,
      threshold: 3,
      windowSeconds: 60,
    },
    rapidMultiTargetAccess: {
      enabled: true,
      uniqueTargetThreshold: 3,
      windowSeconds: 60,
    },
    machinePrivilegedAttempts: {
      enabled: true,
    },
  };
}

function auditEvent({
  occurredAt,
  actor = { kind: 'privileged_human', subject: SUPPORT_ID, role: 'support' },
  eventType = 'privileged_authority_decision',
  action = 'account.read_limited',
  target = { scope: 'system', ref: null },
  outcome = 'denied',
  reason = 'action_not_allowed',
}) {
  return {
    eventType,
    occurredAt,
    actor,
    action,
    target,
    outcome,
    reason,
  };
}

test('invalid or incomplete detection policy fails closed', () => {
  assert.deepEqual(evaluateSecurityAnomalies([], null), {
    status: 'INVALID_POLICY',
    detections: [],
  });

  assert.deepEqual(evaluateSecurityAnomalies([], {
    ...policy(),
    repeatedDenials: { enabled: true, threshold: 0, windowSeconds: 60 },
  }), {
    status: 'INVALID_POLICY',
    detections: [],
  });

  assert.deepEqual(evaluateSecurityAnomalies([], {
    ...policy(),
    hiddenThreshold: 99,
  }), {
    status: 'INVALID_POLICY',
    detections: [],
  });
});

test('repeated denied privileged attempts are detected only inside the supplied window', () => {
  const events = [
    auditEvent({ occurredAt: '2026-09-04T09:00:00Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:20Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:50Z' }),
  ];

  const result = evaluateSecurityAnomalies(events, policy());
  assert.equal(result.status, 'EVALUATED');
  assert.deepEqual(result.detections, [{
    type: 'repeated_privileged_denials',
    actorKey: `privileged_human:${SUPPORT_ID}`,
    windowStart: '2026-09-04T09:00:00.000Z',
    windowEnd: '2026-09-04T09:00:50.000Z',
    count: 3,
  }]);

  const outsideWindow = [
    auditEvent({ occurredAt: '2026-09-04T09:00:00Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:01:01Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:02:02Z' }),
  ];
  assert.deepEqual(evaluateSecurityAnomalies(outsideWindow, policy()), {
    status: 'EVALUATED',
    detections: [],
  });
});

test('anonymous invalid-principal denials are not aggregated as one attributable actor', () => {
  const actor = { kind: 'anonymous', subject: null, role: null };
  const events = [
    auditEvent({ occurredAt: '2026-09-04T09:00:00Z', actor, reason: 'invalid_principal' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:20Z', actor, reason: 'invalid_principal' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:40Z', actor, reason: 'invalid_principal' }),
  ];

  assert.deepEqual(evaluateSecurityAnomalies(events, policy()), {
    status: 'EVALUATED',
    detections: [],
  });
});

test('rapid unique sensitive-target access is detected without counting duplicate targets twice', () => {
  const actor = { kind: 'privileged_human', subject: ADMIN_ID, role: 'admin' };
  const events = [
    auditEvent({
      occurredAt: '2026-09-04T09:00:00Z',
      actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'account-1' },
      outcome: 'allowed',
      reason: 'allowed',
    }),
    auditEvent({
      occurredAt: '2026-09-04T09:00:10Z',
      actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'account-1' },
      outcome: 'allowed',
      reason: 'allowed',
    }),
    auditEvent({
      occurredAt: '2026-09-04T09:00:20Z',
      actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'account-2' },
      outcome: 'allowed',
      reason: 'allowed',
    }),
    auditEvent({
      occurredAt: '2026-09-04T09:00:30Z',
      actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'dog', ref: 'dog-3' },
      outcome: 'allowed',
      reason: 'allowed',
    }),
  ];

  const result = evaluateSecurityAnomalies(events, policy());
  assert.equal(result.status, 'EVALUATED');
  assert.deepEqual(result.detections, [{
    type: 'rapid_multi_target_access',
    actorKey: `privileged_human:${ADMIN_ID}`,
    windowStart: '2026-09-04T09:00:00.000Z',
    windowEnd: '2026-09-04T09:00:30.000Z',
    uniqueTargetCount: 3,
  }]);
});

test('machine attempt to use interactive privileged authority is detected when enabled', () => {
  const event = auditEvent({
    occurredAt: '2026-09-04T09:10:00Z',
    actor: { kind: 'machine', subject: 'service:worker', role: null },
    outcome: 'denied',
    reason: 'machine_principal_not_supported',
  });

  const result = evaluateSecurityAnomalies([event], policy());
  assert.equal(result.status, 'EVALUATED');
  assert.deepEqual(result.detections, [{
    type: 'machine_privileged_authority_attempt',
    actorKey: 'machine:service:worker',
    occurredAt: '2026-09-04T09:10:00.000Z',
  }]);
});

test('detector ignores malformed audit payloads instead of treating them as evidence', () => {
  const malformed = {
    ...auditEvent({ occurredAt: '2026-09-04T09:00:00Z' }),
    token: 'must-not-enter-audit-stream',
  };

  assert.deepEqual(evaluateSecurityAnomalies([malformed, malformed, malformed], policy()), {
    status: 'EVALUATED',
    detections: [],
  });
});

test('evaluation is deterministic regardless of input ordering', () => {
  const events = [
    auditEvent({ occurredAt: '2026-09-04T09:00:50Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:00Z' }),
    auditEvent({ occurredAt: '2026-09-04T09:00:20Z' }),
  ];

  assert.deepEqual(
    evaluateSecurityAnomalies(events, policy()),
    evaluateSecurityAnomalies([...events].reverse(), policy()),
  );
});
