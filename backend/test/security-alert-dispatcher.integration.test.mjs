import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_ALERT_DISPATCH_DB_INTEGRATION === '1';

let sql = null;
let outbox = null;
let dispatcher = null;
let closeDatabase = null;

if (enabled) {
  const [
    { default: postgres },
    outboxModule,
    dispatcherModule,
    dbModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/security-alert-outbox.js'),
    import('../dist/api/security/security-alert-dispatcher.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 8 });
  outbox = outboxModule;
  dispatcher = dispatcherModule;
  closeDatabase = dbModule.closeDatabase;
}

const DETECTION_ID = '92500000-0000-4000-8000-000000000001';
const ATTEMPT_A = '92500000-0000-4000-8000-000000000011';
const ATTEMPT_B = '92500000-0000-4000-8000-000000000012';
const ATTEMPT_C = '92500000-0000-4000-8000-000000000013';
const ATTEMPT_D = '92500000-0000-4000-8000-000000000014';

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

async function seedAlert(policyRevision = 'routing-925-v1') {
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
      ${'9'.repeat(64)},
      'repeated_privileged_denials',
      'detector-v925',
      '2026-10-01T15:10:00.000Z',
      '2026-10-01T15:05:00.000Z',
      '2026-10-01T15:06:00.000Z',
      3,
      NULL
    )
  `;

  const persisted = await outbox.persistSecurityAlertOutboxCandidate(
    {
      schemaVersion: 'security-alert-delivery-v1',
      sourceDetectionHistoryId: DETECTION_ID,
      sourceDetectionType: 'repeated_privileged_denials',
      severity: 'high',
      primaryOwner: 'security_duty',
      detectedAt: '2026-10-01T15:10:00.000Z',
      acknowledgeBy: '2026-10-01T15:15:00.000Z',
      escalationOwner: 'incident_commander',
      escalateAt: '2026-10-01T15:25:00.000Z',
    },
    policyRevision,
  );
  assert.equal(persisted.status, 'ENQUEUED');
  return persisted.record;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('two concurrent workers call the adapter once for one unattempted alert', {
  skip: !enabled,
}, async () => {
  await seedAlert();

  let calls = 0;
  const deliver = async (envelope) => {
    calls += 1;
    assert.deepEqual(
      Object.keys(envelope).sort(),
      [
        'acknowledgeBy',
        'detectedAt',
        'escalateAt',
        'escalationOwner',
        'primaryOwner',
        'schemaVersion',
        'severity',
        'sourceDetectionHistoryId',
        'sourceDetectionType',
      ].sort(),
    );
    return {
      status: 'DELIVERED',
      providerReceiptRef: 'receipt:925-once',
    };
  };

  const ids = [ATTEMPT_A, ATTEMPT_B];
  let idIndex = 0;
  const makeDeps = () => ({
    deliver,
    clock: () => new Date('2026-10-01T15:11:00.000Z'),
    attemptIdFactory: () => ids[idIndex++],
  });

  const results = await Promise.all([
    dispatcher.dispatchNextSecurityAlert(makeDeps()),
    dispatcher.dispatchNextSecurityAlert(makeDeps()),
  ]);

  assert.equal(calls, 1);
  assert.equal(results.filter((result) => result.status === 'DELIVERED').length, 1);
  assert.equal(results.filter((result) => result.status === 'NO_WORK').length, 1);

  const rows = await sql`
    SELECT state, provider_receipt_ref
    FROM security_alert_delivery_attempts
    WHERE attempt_id IN (${ATTEMPT_A}, ${ATTEMPT_B})
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, 'DELIVERED');
  assert.equal(rows[0].provider_receipt_ref, 'receipt:925-once');
});

test('provider-unavailable result persists one terminal failure and is not retried', {
  skip: !enabled,
}, async () => {
  await seedAlert('routing-925-failure');

  const first = await dispatcher.dispatchNextSecurityAlert({
    deliver: async () => ({
      status: 'ATTEMPT_FAILED',
      failureCode: 'PROVIDER_UNAVAILABLE',
    }),
    clock: () => new Date('2026-10-01T15:12:00.000Z'),
    attemptIdFactory: () => ATTEMPT_C,
  });

  assert.deepEqual(first, {
    status: 'ATTEMPT_FAILED',
    attemptId: ATTEMPT_C,
  });

  const second = await dispatcher.dispatchNextSecurityAlert({
    deliver: async () => {
      throw new Error('must not retry automatically');
    },
    clock: () => new Date('2026-10-01T15:13:00.000Z'),
    attemptIdFactory: () => ATTEMPT_D,
  });

  assert.deepEqual(second, { status: 'NO_WORK', attemptId: null });

  const [row] = await sql`
    SELECT state, failure_code
    FROM security_alert_delivery_attempts
    WHERE attempt_id = ${ATTEMPT_C}
  `;
  assert.equal(row.state, 'ATTEMPT_FAILED');
  assert.equal(row.failure_code, 'PROVIDER_UNAVAILABLE');
});

test('thrown adapter error persists only ADAPTER_FAILURE and no exception text', {
  skip: !enabled,
}, async () => {
  await seedAlert('routing-925-throw');

  const result = await dispatcher.dispatchNextSecurityAlert({
    deliver: async () => {
      throw new Error('secret-provider-detail-must-never-persist');
    },
    clock: () => new Date('2026-10-01T15:14:00.000Z'),
    attemptIdFactory: () => ATTEMPT_A,
  });

  assert.deepEqual(result, {
    status: 'ATTEMPT_FAILED',
    attemptId: ATTEMPT_A,
  });

  const [row] = await sql`
    SELECT *
    FROM security_alert_delivery_attempts
    WHERE attempt_id = ${ATTEMPT_A}
  `;
  assert.equal(row.state, 'ATTEMPT_FAILED');
  assert.equal(row.failure_code, 'ADAPTER_FAILURE');
  assert.equal(
    JSON.stringify(row).includes('secret-provider-detail-must-never-persist'),
    false,
  );
});

test('health probe surfaces stale pending and terminal failed alerts using caller bound', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-925-health');

  const begun = await outbox.beginSecurityAlertDeliveryAttempt(
    alert.alertId,
    ATTEMPT_A,
    '2026-10-01T15:00:00.000Z',
  );
  assert.equal(begun.status, 'CREATED');

  const stale = await dispatcher.probeSecurityAlertDispatchHealth({
    now: new Date('2026-10-01T15:20:01.000Z'),
    staleAfterSeconds: 600,
  });
  assert.deepEqual(stale, {
    status: 'ATTENTION_REQUIRED',
    stalePendingCount: 1,
    undeliveredFailedAlertCount: 0,
  });

  await outbox.resolveSecurityAlertOutboxAttempt(ATTEMPT_A, {
    status: 'ATTEMPT_FAILED',
    resolvedAt: '2026-10-01T15:21:00.000Z',
    failureCode: 'DELIVERY_TIMEOUT',
  });

  const failed = await dispatcher.probeSecurityAlertDispatchHealth({
    now: new Date('2026-10-01T15:22:00.000Z'),
    staleAfterSeconds: 600,
  });
  assert.deepEqual(failed, {
    status: 'ATTENTION_REQUIRED',
    stalePendingCount: 0,
    undeliveredFailedAlertCount: 1,
  });
});

test('health probe rejects invalid staleness input', {
  skip: !enabled,
}, async () => {
  assert.deepEqual(
    await dispatcher.probeSecurityAlertDispatchHealth({
      now: new Date('2026-10-01T15:12:00.000Z'),
      staleAfterSeconds: 0,
    }),
    {
      status: 'INVALID_INPUT',
      stalePendingCount: null,
      undeliveredFailedAlertCount: null,
    },
  );
});
