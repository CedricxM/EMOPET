import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_ALERT_OUTBOX_DB_INTEGRATION === '1';

let sql = null;
let outbox = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, outboxModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/security-alert-outbox.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 8 });
  outbox = outboxModule;
  closeDatabase = dbModule.closeDatabase;
}

const DETECTION_ID = '86300000-0000-4000-8000-000000000001';
const UNKNOWN_DETECTION_ID = '86300000-0000-4000-8000-000000000099';
const ATTEMPT_A = '86300000-0000-4000-8000-000000000011';
const ATTEMPT_B = '86300000-0000-4000-8000-000000000012';
const ATTEMPT_C = '86300000-0000-4000-8000-000000000013';

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_alert_delivery_attempts
    WHERE alert_id IN (
      SELECT alert_id
      FROM security_alert_outbox
      WHERE source_detection_history_id = ${DETECTION_ID}
    )
  `;
  await sql`
    DELETE FROM security_alert_outbox
    WHERE source_detection_history_id = ${DETECTION_ID}
  `;
  await sql`
    DELETE FROM security_detection_history
    WHERE detection_id = ${DETECTION_ID}
  `;
}

async function seedDetection() {
  await cleanup();
  await sql`
    INSERT INTO security_detection_history (
      detection_id,
      dedupe_key,
      detector_type,
      policy_revision,
      evaluation_window_start,
      evaluation_window_end,
      recorded_at,
      event_count,
      unique_target_count
    )
    VALUES (
      ${DETECTION_ID},
      ${'a'.repeat(64)},
      'repeated_privileged_denials',
      'detector-v1',
      '2026-10-01T09:50:00.000Z',
      '2026-10-01T09:55:00.000Z',
      '2026-10-01T09:56:00.000Z',
      3,
      NULL
    )
  `;
}

function envelope(overrides = {}) {
  return {
    schemaVersion: 'security-alert-delivery-v1',
    sourceDetectionHistoryId: DETECTION_ID,
    sourceDetectionType: 'repeated_privileged_denials',
    severity: 'high',
    primaryOwner: 'security_duty',
    detectedAt: '2026-10-01T10:00:00.000Z',
    acknowledgeBy: '2026-10-01T10:05:00.000Z',
    escalationOwner: 'incident_commander',
    escalateAt: '2026-10-01T10:15:00.000Z',
    ...overrides,
  };
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('candidate persists minimized envelope and exact duplicate dedupes', {
  skip: !enabled,
}, async () => {
  await seedDetection();

  const first = await outbox.persistSecurityAlertOutboxCandidate(
    envelope(),
    'routing-v1',
  );
  assert.equal(first.status, 'ENQUEUED');
  assert.ok(first.record?.alertId);

  const duplicate = await outbox.persistSecurityAlertOutboxCandidate(
    envelope(),
    'routing-v1',
  );
  assert.equal(duplicate.status, 'DEDUPED');
  assert.equal(duplicate.record?.alertId, first.record.alertId);

  const conflict = await outbox.persistSecurityAlertOutboxCandidate(
    envelope({ severity: 'critical' }),
    'routing-v1',
  );
  assert.deepEqual(conflict, {
    status: 'CONFLICTING_CANDIDATE',
    record: null,
  });

  const [row] = await sql`
    SELECT *
    FROM security_alert_outbox
    WHERE alert_id = ${first.record.alertId}
  `;

  assert.deepEqual(
    Object.keys(row).sort(),
    [
      'acknowledge_by',
      'alert_id',
      'created_at',
      'detected_at',
      'escalate_at',
      'escalation_owner',
      'primary_owner',
      'routing_policy_revision',
      'schema_version',
      'severity',
      'source_detection_history_id',
      'source_detection_type',
    ].sort(),
  );

  const serializedKeys = Object.keys(row).join('|').toLowerCase();
  for (const forbidden of [
    'actor',
    'target',
    'email',
    'phone',
    'webhook',
    'destination',
    'token',
    'message',
    'note',
    'payload',
    'request_body',
    'response_body',
  ]) {
    assert.equal(serializedKeys.includes(forbidden), false, forbidden);
  }
});

test('candidate rejects unknown source and detector-type mismatch', {
  skip: !enabled,
}, async () => {
  await seedDetection();

  assert.deepEqual(
    await outbox.persistSecurityAlertOutboxCandidate(
      envelope({ sourceDetectionHistoryId: UNKNOWN_DETECTION_ID }),
      'routing-v1',
    ),
    { status: 'UNKNOWN_SOURCE', record: null },
  );

  assert.deepEqual(
    await outbox.persistSecurityAlertOutboxCandidate(
      envelope({ sourceDetectionType: 'rapid_multi_target_access' }),
      'routing-v1',
    ),
    { status: 'SOURCE_MISMATCH', record: null },
  );
});

test('database allows only one unresolved pending attempt per alert', {
  skip: !enabled,
}, async () => {
  await seedDetection();
  const candidate = await outbox.persistSecurityAlertOutboxCandidate(
    envelope(),
    'routing-v1',
  );
  assert.equal(candidate.status, 'ENQUEUED');

  const results = await Promise.all([
    outbox.beginSecurityAlertDeliveryAttempt(
      candidate.record.alertId,
      ATTEMPT_A,
      '2026-10-01T10:01:00.000Z',
    ),
    outbox.beginSecurityAlertDeliveryAttempt(
      candidate.record.alertId,
      ATTEMPT_B,
      '2026-10-01T10:01:01.000Z',
    ),
  ]);

  assert.equal(results.filter((value) => value.status === 'CREATED').length, 1);
  assert.equal(results.filter((value) => value.status === 'PENDING_EXISTS').length, 1);

  const [count] = await sql`
    SELECT count(*)::int AS count
    FROM security_alert_delivery_attempts
    WHERE alert_id = ${candidate.record.alertId}
      AND state = 'PENDING'
  `;
  assert.equal(count.count, 1);
});

test('terminal success/failure persistence frees the next pending slot', {
  skip: !enabled,
}, async () => {
  await seedDetection();
  const candidate = await outbox.persistSecurityAlertOutboxCandidate(
    envelope(),
    'routing-v1',
  );
  assert.equal(candidate.status, 'ENQUEUED');

  const begun = await outbox.beginSecurityAlertDeliveryAttempt(
    candidate.record.alertId,
    ATTEMPT_A,
    '2026-10-01T10:01:00.000Z',
  );
  assert.equal(begun.status, 'CREATED');

  const delivered = await outbox.resolveSecurityAlertOutboxAttempt(
    ATTEMPT_A,
    {
      status: 'DELIVERED',
      resolvedAt: '2026-10-01T10:02:00.000Z',
      providerReceiptRef: 'receipt:opaque-863',
    },
  );
  assert.equal(delivered.status, 'RESOLVED');
  assert.equal(delivered.attempt?.state, 'DELIVERED');

  const second = await outbox.beginSecurityAlertDeliveryAttempt(
    candidate.record.alertId,
    ATTEMPT_C,
    '2026-10-01T10:03:00.000Z',
  );
  assert.equal(second.status, 'CREATED');

  const failed = await outbox.resolveSecurityAlertOutboxAttempt(
    ATTEMPT_C,
    {
      status: 'ATTEMPT_FAILED',
      resolvedAt: '2026-10-01T10:04:00.000Z',
      failureCode: 'PROVIDER_UNAVAILABLE',
    },
  );
  assert.equal(failed.status, 'RESOLVED');
  assert.equal(failed.attempt?.state, 'ATTEMPT_FAILED');

  const rows = await sql`
    SELECT attempt_id, state, provider_receipt_ref, failure_code
    FROM security_alert_delivery_attempts
    WHERE alert_id = ${candidate.record.alertId}
    ORDER BY attempted_at
  `;
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => ({
      attemptId: row.attempt_id,
      state: row.state,
      receipt: row.provider_receipt_ref,
      failure: row.failure_code,
    })),
    [
      {
        attemptId: ATTEMPT_A,
        state: 'DELIVERED',
        receipt: 'receipt:opaque-863',
        failure: null,
      },
      {
        attemptId: ATTEMPT_C,
        state: 'ATTEMPT_FAILED',
        receipt: null,
        failure: 'PROVIDER_UNAVAILABLE',
      },
    ],
  );
});

test('malformed chronology and unknown states fail closed', {
  skip: !enabled,
}, async () => {
  await seedDetection();
  const candidate = await outbox.persistSecurityAlertOutboxCandidate(
    envelope(),
    'routing-v1',
  );
  assert.equal(candidate.status, 'ENQUEUED');

  const begun = await outbox.beginSecurityAlertDeliveryAttempt(
    candidate.record.alertId,
    ATTEMPT_A,
    '2026-10-01T10:05:00.000Z',
  );
  assert.equal(begun.status, 'CREATED');

  assert.deepEqual(
    await outbox.resolveSecurityAlertOutboxAttempt(ATTEMPT_A, {
      status: 'DELIVERED',
      resolvedAt: '2026-10-01T10:04:59.000Z',
      providerReceiptRef: 'receipt:too-early',
    }),
    { status: 'INVALID_TIMESTAMP', attempt: null },
  );

  await assert.rejects(() => sql`
    INSERT INTO security_alert_delivery_attempts (
      attempt_id,
      alert_id,
      attempted_at,
      state
    )
    VALUES (
      ${ATTEMPT_B},
      ${candidate.record.alertId},
      '2026-10-01T10:06:00.000Z',
      'UNKNOWN'
    )
  `);
});
