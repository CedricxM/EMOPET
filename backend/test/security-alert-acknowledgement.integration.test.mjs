import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_ALERT_ACK_DB_INTEGRATION === '1';

let sql = null;
let ack = null;
let outbox = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, ackModule, outboxModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/security/security-alert-acknowledgement.js'),
      import('../dist/api/security/security-alert-outbox.js'),
      import('../dist/db/index.js'),
    ]);
  sql = postgres(process.env.DATABASE_URL, { max: 8 });
  ack = ackModule;
  outbox = outboxModule;
  closeDatabase = dbModule.closeDatabase;
}

const DETECTION_ID = '92400000-0000-4000-8000-000000000001';
const REQUEST_A = '92400000-0000-4000-8000-000000000011';
const REQUEST_B = '92400000-0000-4000-8000-000000000012';
const ADMIN_ID = '92400000-0000-4000-8000-000000000021';
const OPERATOR_ID = '92400000-0000-4000-8000-000000000022';

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_alert_acknowledgements
    WHERE request_id IN (${REQUEST_A}, ${REQUEST_B})
  `;
  await sql`
    DELETE FROM security_audit_events
    WHERE id IN (${REQUEST_A}, ${REQUEST_B})
  `;
  await sql`
    DELETE FROM security_alert_delivery_attempts
    WHERE alert_id IN (
      SELECT alert_id FROM security_alert_outbox
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

async function seedAlert() {
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
      ${'b'.repeat(64)},
      'repeated_privileged_denials',
      'detector-v1',
      '2026-10-01T09:50:00.000Z',
      '2026-10-01T09:55:00.000Z',
      '2026-10-01T09:56:00.000Z',
      3,
      NULL
    )
  `;

  const persisted = await outbox.persistSecurityAlertOutboxCandidate({
    schemaVersion: 'security-alert-delivery-v1',
    sourceDetectionHistoryId: DETECTION_ID,
    sourceDetectionType: 'repeated_privileged_denials',
    severity: 'high',
    primaryOwner: 'security_duty',
    detectedAt: '2026-10-01T10:00:00.000Z',
    acknowledgeBy: '2026-10-01T10:05:00.000Z',
    escalationOwner: 'incident_commander',
    escalateAt: '2026-10-01T10:15:00.000Z',
  }, 'routing-v1');

  assert.equal(persisted.status, 'ENQUEUED');
  return persisted.record.alertId;
}

function input(alertId, overrides = {}) {
  return {
    requestId: REQUEST_A,
    alertId,
    actorSubject: ADMIN_ID,
    actorRole: 'admin',
    acknowledgedAt: '2026-10-01T10:01:00.000Z',
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

test('acknowledgement and canonical security audit persist atomically', {
  skip: !enabled,
}, async () => {
  const alertId = await seedAlert();
  const result = await ack.acknowledgeSecurityAlert(input(alertId));
  assert.equal(result.status, 'ACKNOWLEDGED');

  const [storedAck] = await sql`
    SELECT *
    FROM security_alert_acknowledgements
    WHERE alert_id = ${alertId}
  `;
  assert.equal(storedAck.request_id, REQUEST_A);
  assert.equal(storedAck.actor_subject, ADMIN_ID);
  assert.equal(storedAck.actor_role, 'admin');
  assert.equal(storedAck.acknowledged_at.toISOString(), '2026-10-01T10:01:00.000Z');
  assert.equal(storedAck.audit_event_id, REQUEST_A);

  const [audit] = await sql`
    SELECT *
    FROM security_audit_events
    WHERE id = ${REQUEST_A}
  `;
  assert.equal(audit.event_type, 'security_incident_access');
  assert.equal(audit.actor_kind, 'privileged_human');
  assert.equal(audit.actor_subject, ADMIN_ID);
  assert.equal(audit.actor_role, 'admin');
  assert.equal(audit.action, 'security.incident.coordinate');
  assert.equal(audit.target_scope, 'security_incident');
  assert.equal(audit.target_ref, alertId);
  assert.equal(audit.outcome, 'allowed');
  assert.equal(audit.reason, 'allowed');

  const keys = Object.keys(storedAck).join('|').toLowerCase();
  for (const forbidden of [
    'destination',
    'provider',
    'token',
    'payload',
    'message',
    'note',
    'request_body',
    'response_body',
  ]) {
    assert.equal(keys.includes(forbidden), false, forbidden);
  }
});

test('exact replay dedupes while a conflicting second acknowledgement fails closed', {
  skip: !enabled,
}, async () => {
  const alertId = await seedAlert();

  assert.equal(
    (await ack.acknowledgeSecurityAlert(input(alertId))).status,
    'ACKNOWLEDGED',
  );
  assert.equal(
    (await ack.acknowledgeSecurityAlert(input(alertId))).status,
    'DEDUPED',
  );

  const conflict = await ack.acknowledgeSecurityAlert(input(alertId, {
    requestId: REQUEST_B,
    actorSubject: OPERATOR_ID,
    actorRole: 'operator',
    acknowledgedAt: '2026-10-01T10:02:00.000Z',
  }));
  assert.equal(conflict.status, 'ACK_CONFLICT');

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM security_alert_acknowledgements
       WHERE alert_id = ${alertId}) AS ack_count,
      (SELECT count(*)::int FROM security_audit_events
       WHERE id IN (${REQUEST_A}, ${REQUEST_B})) AS audit_count
  `;
  assert.equal(counts.ack_count, 1);
  assert.equal(counts.audit_count, 1);
});

test('chronology and non-coordinate support role fail before durable evidence', {
  skip: !enabled,
}, async () => {
  const alertId = await seedAlert();

  assert.equal(
    (await ack.acknowledgeSecurityAlert(input(alertId, {
      acknowledgedAt: '2026-10-01T09:59:59.999Z',
    }))).status,
    'INVALID_TIMESTAMP',
  );

  assert.equal(
    (await ack.acknowledgeSecurityAlert(input(alertId, {
      actorRole: 'support',
    }))).status,
    'INVALID_INPUT',
  );

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM security_alert_acknowledgements
       WHERE alert_id = ${alertId}) AS ack_count,
      (SELECT count(*)::int FROM security_audit_events
       WHERE id IN (${REQUEST_A}, ${REQUEST_B})) AS audit_count
  `;
  assert.equal(counts.ack_count, 0);
  assert.equal(counts.audit_count, 0);
});

test('two concurrent acknowledgements yield exactly one durable winner', {
  skip: !enabled,
}, async () => {
  const alertId = await seedAlert();

  const results = await Promise.all([
    ack.acknowledgeSecurityAlert(input(alertId)),
    ack.acknowledgeSecurityAlert(input(alertId, {
      requestId: REQUEST_B,
      actorSubject: OPERATOR_ID,
      actorRole: 'operator',
      acknowledgedAt: '2026-10-01T10:01:01.000Z',
    })),
  ]);

  assert.equal(
    results.filter((value) => value.status === 'ACKNOWLEDGED').length,
    1,
  );
  assert.equal(
    results.filter((value) => value.status === 'ACK_CONFLICT').length,
    1,
  );

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM security_alert_acknowledgements
       WHERE alert_id = ${alertId}) AS ack_count,
      (SELECT count(*)::int FROM security_audit_events
       WHERE id IN (${REQUEST_A}, ${REQUEST_B})) AS audit_count
  `;
  assert.equal(counts.ack_count, 1);
  assert.equal(counts.audit_count, 1);
});
