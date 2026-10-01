import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  buildSecurityAlertCandidate,
} = await import('../dist/api/security/security-alert-response.js');

const {
  SECURITY_ALERT_DELIVERY_SCHEMA_VERSION,
  buildSecurityAlertDeliveryEnvelope,
} = await import('../dist/api/security/security-alert-delivery.js');

const authority = JSON.parse(
  await readFile(
    new URL('../config/security/security-alert-delivery-v1.json', import.meta.url),
    'utf8',
  ),
);

const deliverySource = await readFile(
  new URL('../api/security/security-alert-delivery.ts', import.meta.url),
  'utf8',
);

const DETECTION_HISTORY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACTOR_ID = '11111111-1111-4111-8111-111111111111';

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

function internalAlert() {
  const result = buildSecurityAlertCandidate({
    type: 'repeated_privileged_denials',
    actorKey: `privileged_human:${ACTOR_ID}`,
    windowStart: '2026-10-01T10:00:00Z',
    windowEnd: '2026-10-01T10:01:00Z',
    count: 3,
  }, policy(), '2026-10-01T10:01:05Z');

  assert.equal(result.status, 'BUILT');
  return result.alert;
}

test('#854 projects internal alert candidates into a bounded provider-neutral envelope', () => {
  assert.deepEqual(
    buildSecurityAlertDeliveryEnvelope(internalAlert(), DETECTION_HISTORY_ID),
    {
      status: 'BUILT',
      envelope: {
        schemaVersion: SECURITY_ALERT_DELIVERY_SCHEMA_VERSION,
        sourceDetectionHistoryId: DETECTION_HISTORY_ID,
        sourceDetectionType: 'repeated_privileged_denials',
        severity: 'high',
        primaryOwner: 'security_duty',
        detectedAt: '2026-10-01T10:01:05.000Z',
        acknowledgeBy: '2026-10-01T10:06:05.000Z',
        escalationOwner: 'incident_commander',
        escalateAt: '2026-10-01T10:16:05.000Z',
      },
    },
  );
});

test('#854 strips actor identity and provider/contact metadata from the delivery boundary', () => {
  const result = buildSecurityAlertDeliveryEnvelope(
    internalAlert(),
    DETECTION_HISTORY_ID,
  );
  assert.equal(result.status, 'BUILT');

  const serialized = JSON.stringify(result.envelope);
  assert.doesNotMatch(serialized, /sourceActorKey/);
  assert.doesNotMatch(serialized, new RegExp(ACTOR_ID));
  assert.doesNotMatch(
    serialized,
    /targetRef|email|phone|webhook|channel|destination|token|message|body|note/i,
  );

  assert.deepEqual(
    Object.keys(result.envelope).sort(),
    [...authority.allowedFields].sort(),
  );
});

test('#854 rejects malformed durable references and non-canonical alert candidates', () => {
  assert.deepEqual(
    buildSecurityAlertDeliveryEnvelope(internalAlert(), 'not-a-uuid'),
    { status: 'INVALID_DETECTION_HISTORY_ID', envelope: null },
  );

  assert.deepEqual(
    buildSecurityAlertDeliveryEnvelope({
      ...internalAlert(),
      webhook: 'https://example.invalid/hook',
    }, DETECTION_HISTORY_ID),
    { status: 'INVALID_ALERT', envelope: null },
  );

  assert.deepEqual(
    buildSecurityAlertDeliveryEnvelope({
      ...internalAlert(),
      sourceActorKey: 'anonymous:spoofed',
    }, DETECTION_HISTORY_ID),
    { status: 'INVALID_ALERT', envelope: null },
  );
});

test('#854 authority keeps provider selection, delivery, acknowledgement and SLA inactive', () => {
  assert.equal(authority.issue, 854);
  assert.equal(authority.parentIssue, 526);
  assert.match(authority.status, /NO_DELIVERY_ACTIVATION/);
  assert.equal(authority.durableReference, 'security_detection_history.detection_id');

  for (const key of authority.forbiddenProviderPayloadFields) {
    assert.ok(!authority.allowedFields.includes(key), key);
  }

  for (const value of Object.values(authority.nonEffects)) {
    assert.equal(value, false);
  }
});

test('#854 delivery projection has no network, provider-secret or HTTP activation primitive', () => {
  assert.doesNotMatch(deliverySource, /\bfetch\s*\(/);
  assert.doesNotMatch(deliverySource, /\bprocess\.env\b/);
  assert.doesNotMatch(deliverySource, /\baxios\b/);
  assert.doesNotMatch(deliverySource, /https?\.request\s*\(/);
  assert.doesNotMatch(deliverySource, /app\.(get|post|put|patch|delete)\s*\(/);
});
