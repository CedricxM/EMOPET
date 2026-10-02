import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_ALERT_ESCALATION_DB_INTEGRATION === '1';

let sql = null;
let ack = null;
let outbox = null;
let escalator = null;
let closeDatabase = null;

if (enabled) {
  const [
    { default: postgres },
    ackModule,
    outboxModule,
    escalatorModule,
    dbModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/security-alert-acknowledgement.js'),
    import('../dist/api/security/security-alert-outbox.js'),
    import('../dist/api/security/security-alert-escalator.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 8 });
  ack = ackModule;
  outbox = outboxModule;
  escalator = escalatorModule;
  closeDatabase = dbModule.closeDatabase;
}

const DETECTION_ID = '99900000-0000-4000-8000-000000000001';
const ATTEMPT_A = '99900000-0000-4000-8000-000000000011';
const ATTEMPT_B = '99900000-0000-4000-8000-000000000012';
const ATTEMPT_C = '99900000-0000-4000-8000-000000000013';
const REQUEST_A = '99900000-0000-4000-8000-000000000021';
const ADMIN_ID = '99900000-0000-4000-8000-000000000031';

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_alert_escalation_attempts
    WHERE alert_id IN (
      SELECT alert_id
      FROM security_alert_outbox
      WHERE source_detection_history_id = ${DETECTION_ID}
    )
  `;
  await sql`
    DELETE FROM security_alert_acknowledgements
    WHERE request_id = ${REQUEST_A}
  `;
  await sql`
    DELETE FROM security_audit_events
    WHERE id = ${REQUEST_A}
  `;
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

async function seedAlert(policyRevision = 'routing-999-v1') {
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
      ${'c'.repeat(64)},
      'repeated_privileged_denials',
      'detector-v999',
      '2026-10-02T08:00:00.000Z',
      '2026-10-02T08:05:00.000Z',
      '2026-10-02T08:06:00.000Z',
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
      detectedAt: '2026-10-02T08:10:00.000Z',
      acknowledgeBy: '2026-10-02T08:15:00.000Z',
      escalationOwner: 'incident_commander',
      escalateAt: '2026-10-02T08:25:00.000Z',
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

test('alert is not escalation work before its controlled escalateAt', {
  skip: !enabled,
}, async () => {
  await seedAlert();

  let calls = 0;
  const result = await escalator.escalateNextSecurityAlert({
    escalate: async () => {
      calls += 1;
      return { status: 'DELIVERED', providerReceiptRef: 'should-not-run' };
    },
    clock: () => new Date('2026-10-02T08:24:59.999Z'),
    attemptIdFactory: () => ATTEMPT_A,
  });

  assert.deepEqual(result, { status: 'NO_WORK', attemptId: null });
  assert.equal(calls, 0);
});

test('durable acknowledgement at or before claim suppresses escalation', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-999-ack');

  const acknowledged = await ack.acknowledgeSecurityAlert({
    requestId: REQUEST_A,
    alertId: alert.alertId,
    actorSubject: ADMIN_ID,
    actorRole: 'admin',
    acknowledgedAt: '2026-10-02T08:25:00.000Z',
  });
  assert.equal(acknowledged.status, 'ACKNOWLEDGED');

  let calls = 0;
  const result = await escalator.escalateNextSecurityAlert({
    escalate: async () => {
      calls += 1;
      return { status: 'DELIVERED', providerReceiptRef: 'must-not-run' };
    },
    clock: () => new Date('2026-10-02T08:25:00.000Z'),
    attemptIdFactory: () => ATTEMPT_A,
  });

  assert.deepEqual(result, { status: 'NO_WORK', attemptId: null });
  assert.equal(calls, 0);

  const rows = await sql`
    SELECT count(*)::int AS count
    FROM security_alert_escalation_attempts
    WHERE alert_id = ${alert.alertId}
  `;
  assert.equal(rows[0].count, 0);
});

test('two concurrent due workers create one escalation and expose only symbolic owner', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-999-race');

  let calls = 0;
  const escalate = async (input) => {
    calls += 1;
    assert.equal(input.escalationOwner, 'incident_commander');
    assert.equal(input.envelope.escalationOwner, 'incident_commander');
    assert.deepEqual(
      Object.keys(input).sort(),
      ['envelope', 'escalationOwner'].sort(),
    );
    return {
      status: 'DELIVERED',
      providerReceiptRef: 'receipt:999-escalated',
    };
  };

  const ids = [ATTEMPT_A, ATTEMPT_B];
  let idIndex = 0;
  const makeDeps = () => ({
    escalate,
    clock: () => new Date('2026-10-02T08:25:01.000Z'),
    attemptIdFactory: () => ids[idIndex++],
  });

  const results = await Promise.all([
    escalator.escalateNextSecurityAlert(makeDeps()),
    escalator.escalateNextSecurityAlert(makeDeps()),
  ]);

  assert.equal(calls, 1);
  assert.equal(results.filter((r) => r.status === 'DELIVERED').length, 1);
  assert.equal(results.filter((r) => r.status === 'NO_WORK').length, 1);

  const rows = await sql`
    SELECT *
    FROM security_alert_escalation_attempts
    WHERE alert_id = ${alert.alertId}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, 'DELIVERED');
  assert.equal(rows[0].escalation_owner, 'incident_commander');
  assert.equal(rows[0].provider_receipt_ref, 'receipt:999-escalated');

  const keys = Object.keys(rows[0]).join('|').toLowerCase();
  for (const forbidden of [
    'destination',
    'email',
    'phone',
    'webhook',
    'channel',
    'token',
    'message',
    'payload',
    'contact',
  ]) {
    assert.equal(keys.includes(forbidden), false, forbidden);
  }
});

test('adapter exception persists only ADAPTER_FAILURE and is not retried', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-999-throw');

  const first = await escalator.escalateNextSecurityAlert({
    escalate: async () => {
      throw new Error('private-provider-detail-must-not-persist');
    },
    clock: () => new Date('2026-10-02T08:26:00.000Z'),
    attemptIdFactory: () => ATTEMPT_C,
  });

  assert.deepEqual(first, {
    status: 'ATTEMPT_FAILED',
    attemptId: ATTEMPT_C,
  });

  const second = await escalator.escalateNextSecurityAlert({
    escalate: async () => {
      throw new Error('retry must remain unauthorized');
    },
    clock: () => new Date('2026-10-02T08:27:00.000Z'),
    attemptIdFactory: () => ATTEMPT_A,
  });
  assert.deepEqual(second, { status: 'NO_WORK', attemptId: null });

  const [row] = await sql`
    SELECT *
    FROM security_alert_escalation_attempts
    WHERE alert_id = ${alert.alertId}
  `;
  assert.equal(row.state, 'ATTEMPT_FAILED');
  assert.equal(row.failure_code, 'ADAPTER_FAILURE');
  assert.equal(
    JSON.stringify(row).includes('private-provider-detail-must-not-persist'),
    false,
  );
});

test('malformed adapter output collapses to ADAPTER_FAILURE without persistence', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-999-malformed');

  const result = await escalator.escalateNextSecurityAlert({
    escalate: async () => ({
      status: 'DELIVERED',
      providerReceiptRef: 'bad receipt with spaces and private detail',
    }),
    clock: () => new Date('2026-10-02T08:26:30.000Z'),
    attemptIdFactory: () => ATTEMPT_B,
  });

  assert.deepEqual(result, {
    status: 'ATTEMPT_FAILED',
    attemptId: ATTEMPT_B,
  });

  const [row] = await sql`
    SELECT *
    FROM security_alert_escalation_attempts
    WHERE alert_id = ${alert.alertId}
  `;
  assert.equal(row.state, 'ATTEMPT_FAILED');
  assert.equal(row.failure_code, 'ADAPTER_FAILURE');
  assert.equal(row.provider_receipt_ref, null);
  assert.equal(
    JSON.stringify(row).includes('bad receipt with spaces and private detail'),
    false,
  );
});

test('health probe reports stale pending and failed escalation using caller bound', {
  skip: !enabled,
}, async () => {
  const alert = await seedAlert('routing-999-health');

  await sql`
    INSERT INTO security_alert_escalation_attempts (
      attempt_id,
      alert_id,
      escalation_owner,
      attempted_at,
      state
    )
    VALUES (
      ${ATTEMPT_A},
      ${alert.alertId},
      'incident_commander',
      '2026-10-02T08:25:00.000Z',
      'PENDING'
    )
  `;

  const stale = await escalator.probeSecurityAlertEscalationHealth({
    now: new Date('2026-10-02T08:35:01.000Z'),
    staleAfterSeconds: 600,
  });
  assert.deepEqual(stale, {
    status: 'ATTENTION_REQUIRED',
    stalePendingCount: 1,
    failedEscalationCount: 0,
  });

  await sql`
    UPDATE security_alert_escalation_attempts
    SET
      state = 'ATTEMPT_FAILED',
      resolved_at = '2026-10-02T08:36:00.000Z',
      failure_code = 'DELIVERY_TIMEOUT'
    WHERE attempt_id = ${ATTEMPT_A}
  `;

  const failed = await escalator.probeSecurityAlertEscalationHealth({
    now: new Date('2026-10-02T08:37:00.000Z'),
    staleAfterSeconds: 600,
  });
  assert.deepEqual(failed, {
    status: 'ATTENTION_REQUIRED',
    stalePendingCount: 0,
    failedEscalationCount: 1,
  });
});

test('health probe rejects an invalid caller staleness bound', {
  skip: !enabled,
}, async () => {
  assert.deepEqual(
    await escalator.probeSecurityAlertEscalationHealth({
      now: new Date('2026-10-02T08:30:00.000Z'),
      staleAfterSeconds: 0,
    }),
    {
      status: 'INVALID_INPUT',
      stalePendingCount: null,
      failedEscalationCount: null,
    },
  );
});
