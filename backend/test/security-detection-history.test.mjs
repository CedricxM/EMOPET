import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildSecurityDetectionHistoryRecords,
  mapSecurityDetectionEvidence,
} = await import('../dist/api/security/security-detection-history.js');

const ACTOR = '11111111-1111-4111-8111-111111111111';

function event({
  occurredAt,
  eventType = 'privileged_authority_decision',
  actor = { kind: 'privileged_human', subject: ACTOR, role: 'support' },
  action = 'moderation.queue.read',
  target = { scope: 'support_case', ref: 'hist805:case' },
  outcome = 'denied',
  reason = 'action_not_allowed',
}) {
  return {
    schemaVersion: 'security-audit-v1',
    eventType,
    occurredAt,
    actor,
    action,
    target,
    outcome,
    reason,
  };
}

test('repeated-denial evidence maps to exact canonical source ids without persisting actorKey', () => {
  const source = [
    { id: '00000000-0000-4000-8000-000000000003', event: event({ occurredAt: '2026-10-01T09:00:20.000Z' }) },
    { id: '00000000-0000-4000-8000-000000000001', event: event({ occurredAt: '2026-10-01T09:00:00.000Z' }) },
    { id: '00000000-0000-4000-8000-000000000002', event: event({ occurredAt: '2026-10-01T09:00:10.000Z' }) },
  ];
  const detections = [{
    type: 'repeated_privileged_denials',
    actorKey: `privileged_human:${ACTOR}`,
    windowStart: '2026-10-01T09:00:00.000Z',
    windowEnd: '2026-10-01T09:00:20.000Z',
    count: 3,
  }];

  const evidence = mapSecurityDetectionEvidence(source, detections);
  assert.ok(evidence);
  assert.deepEqual(evidence[0].sourceEventIds, [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
  ]);

  const records = buildSecurityDetectionHistoryRecords({
    policyRevision: 'test.history.v1',
    evaluationWindowStart: '2026-10-01T08:59:00.000Z',
    evaluationWindowEnd: '2026-10-01T09:01:00.000Z',
    evidence,
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].detectorType, 'repeated_privileged_denials');
  assert.equal(records[0].eventCount, 3);
  assert.equal(records[0].uniqueTargetCount, null);
  assert.match(records[0].dedupeKey, /^[0-9a-f]{64}$/);
  assert.equal('actorKey' in records[0], false);
});

test('rapid multi-target evidence includes duplicate-target rows until threshold crossing', () => {
  const actor = { kind: 'privileged_human', subject: ACTOR, role: 'admin' };
  const source = [
    { id: '00000000-0000-4000-8000-000000000011', event: event({
      occurredAt: '2026-10-01T09:10:00.000Z', actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'a1' },
      outcome: 'allowed', reason: 'allowed',
    }) },
    { id: '00000000-0000-4000-8000-000000000012', event: event({
      occurredAt: '2026-10-01T09:10:01.000Z', actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'a1' },
      outcome: 'allowed', reason: 'allowed',
    }) },
    { id: '00000000-0000-4000-8000-000000000013', event: event({
      occurredAt: '2026-10-01T09:10:02.000Z', actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'account', ref: 'a2' },
      outcome: 'allowed', reason: 'allowed',
    }) },
    { id: '00000000-0000-4000-8000-000000000014', event: event({
      occurredAt: '2026-10-01T09:10:03.000Z', actor,
      eventType: 'privileged_sensitive_access',
      target: { scope: 'dog', ref: 'd3' },
      outcome: 'allowed', reason: 'allowed',
    }) },
  ];

  const evidence = mapSecurityDetectionEvidence(source, [{
    type: 'rapid_multi_target_access',
    actorKey: `privileged_human:${ACTOR}`,
    windowStart: '2026-10-01T09:10:00.000Z',
    windowEnd: '2026-10-01T09:10:03.000Z',
    uniqueTargetCount: 3,
  }]);

  assert.ok(evidence);
  assert.deepEqual(evidence[0].sourceEventIds, source.map(({ id }) => id));
});

test('identical machine detections bind distinct same-time canonical rows deterministically', () => {
  const machine = { kind: 'machine', subject: 'service:test-worker', role: null };
  const source = [
    { id: '00000000-0000-4000-8000-000000000021', event: event({
      occurredAt: '2026-10-01T09:20:00.000Z',
      actor: machine,
      reason: 'machine_principal_not_supported',
    }) },
    { id: '00000000-0000-4000-8000-000000000022', event: event({
      occurredAt: '2026-10-01T09:20:00.000Z',
      actor: machine,
      reason: 'machine_principal_not_supported',
    }) },
  ];
  const detection = {
    type: 'machine_privileged_authority_attempt',
    actorKey: 'machine:service:test-worker',
    occurredAt: '2026-10-01T09:20:00.000Z',
  };

  const evidence = mapSecurityDetectionEvidence(source, [detection, detection]);
  assert.ok(evidence);
  assert.deepEqual(evidence.map((entry) => entry.sourceEventIds), [
    ['00000000-0000-4000-8000-000000000021'],
    ['00000000-0000-4000-8000-000000000022'],
  ]);
});

test('dedupe key is stable across reevaluation windows for identical controlled evidence', () => {
  const evidence = [{
    detection: {
      type: 'repeated_privileged_denials',
      actorKey: `privileged_human:${ACTOR}`,
      windowStart: '2026-10-01T09:00:00.000Z',
      windowEnd: '2026-10-01T09:00:20.000Z',
      count: 3,
    },
    sourceEventIds: [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
    ],
  }];

  const first = buildSecurityDetectionHistoryRecords({
    policyRevision: 'test.history.v1',
    evaluationWindowStart: '2026-10-01T08:59:00.000Z',
    evaluationWindowEnd: '2026-10-01T09:01:00.000Z',
    evidence,
  });
  const replay = buildSecurityDetectionHistoryRecords({
    policyRevision: 'test.history.v1',
    evaluationWindowStart: '2026-10-01T08:58:00.000Z',
    evaluationWindowEnd: '2026-10-01T09:02:00.000Z',
    evidence,
  });

  assert.equal(first[0].dedupeKey, replay[0].dedupeKey);
});

test('unreconcilable detector output fails closed', () => {
  const evidence = mapSecurityDetectionEvidence([], [{
    type: 'machine_privileged_authority_attempt',
    actorKey: 'machine:service:missing',
    occurredAt: '2026-10-01T09:20:00.000Z',
  }]);
  assert.equal(evidence, null);
});
