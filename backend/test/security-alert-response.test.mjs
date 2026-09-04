import test from 'node:test';
import assert from 'node:assert/strict';

const {
  SECURITY_ALERT_SCHEMA_VERSION,
  buildSecurityAlertCandidate,
  evaluateSecurityAlertResponse,
} = await import('../dist/api/security/security-alert-response.js');

function policy() {
  return {
    repeated_privileged_denials: {
      severity: 'high',
      primaryOwner: 'security_duty',
      acknowledgeWithinSeconds: 300,
      escalationOwner: 'incident_commander',
      escalateAfterSeconds: 900,
    },
    rapid_multi_target_access: {
      severity: 'critical',
      primaryOwner: 'security_duty',
      acknowledgeWithinSeconds: 120,
      escalationOwner: 'incident_commander',
      escalateAfterSeconds: 300,
    },
    machine_privileged_authority_attempt: {
      severity: 'medium',
      primaryOwner: 'security_duty',
      acknowledgeWithinSeconds: 600,
      escalationOwner: 'incident_commander',
      escalateAfterSeconds: 1800,
    },
  };
}

function detection() {
  return {
    type: 'repeated_privileged_denials',
    actorKey: 'privileged_human:11111111-1111-4111-8111-111111111111',
    windowStart: '2026-09-04T09:00:00Z',
    windowEnd: '2026-09-04T09:04:00Z',
    count: 5,
  };
}

function builtAlert() {
  const result = buildSecurityAlertCandidate(detection(), policy(), '2026-09-04T09:05:00Z');
  assert.equal(result.status, 'BUILT');
  return result.alert;
}

test('alert builder produces a bounded deterministic routing candidate', () => {
  assert.deepEqual(buildSecurityAlertCandidate(detection(), policy(), '2026-09-04T09:05:00Z'), {
    status: 'BUILT',
    alert: {
      schemaVersion: SECURITY_ALERT_SCHEMA_VERSION,
      sourceDetectionType: 'repeated_privileged_denials',
      sourceActorKey: 'privileged_human:11111111-1111-4111-8111-111111111111',
      sourceOccurredAt: '2026-09-04T09:04:00.000Z',
      detectedAt: '2026-09-04T09:05:00.000Z',
      severity: 'high',
      primaryOwner: 'security_duty',
      acknowledgeBy: '2026-09-04T09:10:00.000Z',
      escalationOwner: 'incident_commander',
      escalateAt: '2026-09-04T09:20:00.000Z',
    },
  });
});

test('alert builder rejects incomplete, extra-field and impossible routing policies', () => {
  const missingRoute = policy();
  delete missingRoute.machine_privileged_authority_attempt;
  assert.deepEqual(buildSecurityAlertCandidate(detection(), missingRoute, '2026-09-04T09:05:00Z'), {
    status: 'INVALID_POLICY',
    alert: null,
  });

  assert.deepEqual(buildSecurityAlertCandidate(detection(), {
    ...policy(),
    webhookUrl: 'https://example.invalid/hook',
  }, '2026-09-04T09:05:00Z'), {
    status: 'INVALID_POLICY',
    alert: null,
  });

  const zeroWindow = policy();
  zeroWindow.repeated_privileged_denials.acknowledgeWithinSeconds = 0;
  assert.equal(buildSecurityAlertCandidate(detection(), zeroWindow, '2026-09-04T09:05:00Z').status, 'INVALID_POLICY');

  const impossibleOrder = policy();
  impossibleOrder.repeated_privileged_denials.escalateAfterSeconds = 60;
  assert.equal(buildSecurityAlertCandidate(detection(), impossibleOrder, '2026-09-04T09:05:00Z').status, 'INVALID_POLICY');
});

test('alert builder rejects malformed detections and non-UTC detected-at timestamps', () => {
  assert.equal(buildSecurityAlertCandidate({ ...detection(), type: 'unknown_detection' }, policy(), '2026-09-04T09:05:00Z').status, 'INVALID_DETECTION');
  assert.equal(buildSecurityAlertCandidate({ ...detection(), note: 'free form' }, policy(), '2026-09-04T09:05:00Z').status, 'INVALID_DETECTION');
  assert.equal(buildSecurityAlertCandidate(detection(), policy(), '2026-09-04T11:05:00+02:00').status, 'INVALID_TIMESTAMP');
});

test('response evaluation exposes open, acknowledgement-overdue and escalation boundaries', () => {
  const alert = builtAlert();

  assert.deepEqual(evaluateSecurityAlertResponse(alert, '2026-09-04T09:09:59Z'), {
    status: 'EVALUATED',
    state: 'OPEN',
    acknowledgementLatencySeconds: null,
    acknowledgementOnTime: null,
  });

  assert.deepEqual(evaluateSecurityAlertResponse(alert, '2026-09-04T09:10:00Z'), {
    status: 'EVALUATED',
    state: 'ACK_OVERDUE',
    acknowledgementLatencySeconds: null,
    acknowledgementOnTime: null,
  });

  assert.deepEqual(evaluateSecurityAlertResponse(alert, '2026-09-04T09:20:00Z'), {
    status: 'EVALUATED',
    state: 'ESCALATION_DUE',
    acknowledgementLatencySeconds: null,
    acknowledgementOnTime: null,
  });
});

test('response evaluation records bounded acknowledgement latency and timeliness', () => {
  const alert = builtAlert();

  assert.deepEqual(evaluateSecurityAlertResponse(alert, '2026-09-04T09:08:00Z', {
    acknowledgedAt: '2026-09-04T09:08:00Z',
    acknowledgedBy: 'security_duty',
  }), {
    status: 'EVALUATED',
    state: 'ACKNOWLEDGED',
    acknowledgementLatencySeconds: 180,
    acknowledgementOnTime: true,
  });

  assert.deepEqual(evaluateSecurityAlertResponse(alert, '2026-09-04T09:12:00Z', {
    acknowledgedAt: '2026-09-04T09:12:00Z',
    acknowledgedBy: 'incident_commander',
  }), {
    status: 'EVALUATED',
    state: 'ACKNOWLEDGED',
    acknowledgementLatencySeconds: 420,
    acknowledgementOnTime: false,
  });
});

test('response evaluation fails closed on invalid acknowledgement authority or chronology', () => {
  const alert = builtAlert();

  assert.equal(evaluateSecurityAlertResponse(alert, '2026-09-04T09:08:00Z', {
    acknowledgedAt: '2026-09-04T09:08:00Z',
    acknowledgedBy: 'support',
  }).status, 'INVALID_ACKNOWLEDGEMENT');

  assert.equal(evaluateSecurityAlertResponse(alert, '2026-09-04T09:08:00Z', {
    acknowledgedAt: '2026-09-04T09:09:00Z',
    acknowledgedBy: 'security_duty',
  }).status, 'INVALID_ACKNOWLEDGEMENT');

  assert.equal(evaluateSecurityAlertResponse(alert, '2026-09-04T09:04:59Z').status, 'INVALID_TIMESTAMP');
});

test('core alert contract rejects arbitrary delivery/contact metadata', () => {
  const alert = builtAlert();
  assert.equal(evaluateSecurityAlertResponse({ ...alert, email: 'security@example.invalid' }, '2026-09-04T09:06:00Z').status, 'INVALID_ALERT');
  assert.equal(evaluateSecurityAlertResponse({ ...alert, webhook: 'https://example.invalid' }, '2026-09-04T09:06:00Z').status, 'INVALID_ALERT');
});
