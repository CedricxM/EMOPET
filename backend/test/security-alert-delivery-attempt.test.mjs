import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const {
  buildSecurityAlertCandidate,
} = await import('../dist/api/security/security-alert-response.js');

const {
  buildSecurityAlertDeliveryEnvelope,
  parseSecurityAlertDeliveryEnvelope,
} = await import('../dist/api/security/security-alert-delivery.js');

const {
  SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
  createSecurityAlertDeliveryAttempt,
  resolveSecurityAlertDeliveryAttempt,
} = await import('../dist/api/security/security-alert-delivery-attempt.js');

const authority = JSON.parse(
  await readFile(
    new URL('../../config/security/security-alert-delivery-attempt-v1.json', import.meta.url),
    'utf8',
  ),
);

const attemptSource = await readFile(
  new URL('../api/security/security-alert-delivery-attempt.ts', import.meta.url),
  'utf8',
);

const DETECTION_HISTORY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ATTEMPT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
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

function envelope() {
  const alert = buildSecurityAlertCandidate({
    type: 'repeated_privileged_denials',
    actorKey: `privileged_human:${ACTOR_ID}`,
    windowStart: '2026-10-01T10:00:00Z',
    windowEnd: '2026-10-01T10:01:00Z',
    count: 3,
  }, policy(), '2026-10-01T10:01:05Z');
  assert.equal(alert.status, 'BUILT');

  const projected = buildSecurityAlertDeliveryEnvelope(
    alert.alert,
    DETECTION_HISTORY_ID,
  );
  assert.equal(projected.status, 'BUILT');
  return projected.envelope;
}

function pendingAttempt() {
  const result = createSecurityAlertDeliveryAttempt(
    envelope(),
    ATTEMPT_ID,
    '2026-10-01T10:01:10Z',
  );
  assert.equal(result.status, 'BUILT');
  return result.attempt;
}

test('#859 accepts only canonical minimized delivery envelopes', () => {
  const canonical = envelope();
  assert.deepEqual(parseSecurityAlertDeliveryEnvelope(canonical), canonical);

  assert.equal(parseSecurityAlertDeliveryEnvelope({
    ...canonical,
    sourceActorKey: `privileged_human:${ACTOR_ID}`,
  }), null);

  assert.equal(parseSecurityAlertDeliveryEnvelope({
    ...canonical,
    webhook: 'https://example.invalid/hook',
  }), null);
});

test('#859 creates one bounded pending attempt without provider or retry metadata', () => {
  assert.deepEqual(
    createSecurityAlertDeliveryAttempt(
      envelope(),
      ATTEMPT_ID,
      '2026-10-01T10:01:10Z',
    ),
    {
      status: 'BUILT',
      attempt: {
        schemaVersion: SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
        attemptId: ATTEMPT_ID,
        envelope: envelope(),
        attemptedAt: '2026-10-01T10:01:10.000Z',
        state: 'PENDING',
        resolvedAt: null,
        providerReceiptRef: null,
        failureCode: null,
      },
    },
  );
});

test('#859 resolves a delivered attempt with only an opaque bounded provider receipt', () => {
  const result = resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
    status: 'DELIVERED',
    resolvedAt: '2026-10-01T10:01:12Z',
    providerReceiptRef: 'receipt:opaque_123',
  });

  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.attempt.state, 'DELIVERED');
  assert.equal(result.attempt.providerReceiptRef, 'receipt:opaque_123');
  assert.equal(result.attempt.failureCode, null);
});

test('#859 resolves failed attempts with finite codes and rejects raw provider errors', () => {
  const result = resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
    status: 'ATTEMPT_FAILED',
    resolvedAt: '2026-10-01T10:01:12Z',
    failureCode: 'PROVIDER_UNAVAILABLE',
  });

  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.attempt.state, 'ATTEMPT_FAILED');
  assert.equal(result.attempt.failureCode, 'PROVIDER_UNAVAILABLE');
  assert.equal(result.attempt.providerReceiptRef, null);

  assert.deepEqual(
    resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
      status: 'ATTEMPT_FAILED',
      resolvedAt: '2026-10-01T10:01:12Z',
      failureCode: 'socket ECONNRESET secret=abc',
    }),
    { status: 'INVALID_RESULT', attempt: null },
  );

  assert.deepEqual(
    resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
      status: 'ATTEMPT_FAILED',
      resolvedAt: '2026-10-01T10:01:12Z',
      failureCode: 'PROVIDER_UNAVAILABLE',
      providerError: 'raw stack trace',
    }),
    { status: 'INVALID_RESULT', attempt: null },
  );
});

test('#859 fails closed on invalid ids, chronology, resolved attempts and extra fields', () => {
  assert.equal(
    createSecurityAlertDeliveryAttempt(
      envelope(),
      'not-a-uuid',
      '2026-10-01T10:01:10Z',
    ).status,
    'INVALID_ATTEMPT_ID',
  );

  assert.equal(
    createSecurityAlertDeliveryAttempt(
      envelope(),
      ATTEMPT_ID,
      '2026-10-01T10:01:04Z',
    ).status,
    'INVALID_TIMESTAMP',
  );

  assert.equal(
    resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
      status: 'DELIVERED',
      resolvedAt: '2026-10-01T10:01:09Z',
      providerReceiptRef: 'receipt:opaque_123',
    }).status,
    'INVALID_TIMESTAMP',
  );

  const delivered = resolveSecurityAlertDeliveryAttempt(pendingAttempt(), {
    status: 'DELIVERED',
    resolvedAt: '2026-10-01T10:01:12Z',
    providerReceiptRef: 'receipt:opaque_123',
  });
  assert.equal(delivered.status, 'RESOLVED');
  assert.equal(
    resolveSecurityAlertDeliveryAttempt(delivered.attempt, {
      status: 'DELIVERED',
      resolvedAt: '2026-10-01T10:01:13Z',
      providerReceiptRef: 'receipt:duplicate',
    }).status,
    'INVALID_ATTEMPT',
  );
});

test('#859 authority keeps provider/retry/SLA/HTTP inactive while #863 supplies durability', () => {
  assert.equal(authority.issue, 859);
  assert.equal(authority.parentIssue, 526);
  assert.match(authority.status, /NO_DELIVERY_OR_RETRY_ACTIVATION/);

  for (const value of Object.values(authority.nonEffects)) {
    assert.equal(value, false);
  }

  assert.deepEqual(authority.durability, {
    databasePersistenceActivated: true,
    issue: 863,
    mergedPr: 879,
    outboxTable: 'security_alert_outbox',
    attemptTable: 'security_alert_delivery_attempts',
  });
  assert.match(authority.durableOutboxFollowUp, /ISSUE_863_PR_879/);
});

test('#859 attempt contract contains no network, environment, HTTP or scheduling primitive', () => {
  assert.doesNotMatch(attemptSource, /\bfetch\s*\(/);
  assert.doesNotMatch(attemptSource, /\bprocess\.env\b/);
  assert.doesNotMatch(attemptSource, /\baxios\b/);
  assert.doesNotMatch(attemptSource, /https?\.request\s*\(/);
  assert.doesNotMatch(attemptSource, /app\.(get|post|put|patch|delete)\s*\(/);
  assert.doesNotMatch(attemptSource, /setInterval|setTimeout|cron/i);
});
