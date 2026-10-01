import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_ALERT_ACK_DB_INTEGRATION === '1';

let sql = null;
let acknowledgement = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, ackModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/security-alert-acknowledgement.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 8 });
  acknowledgement = ackModule;
  closeDatabase = dbModule.closeDatabase;
}

const DETECTION_ID = '92430000-0000-4000-8000-000000000001';
const ALERT_ID = '92430000-0000-4000-8000-000000000002';
const OPERATOR_ID = '92430000-0000-4000-8000-000000000003';
const ADMIN_ID = '92430000-0000-4000-8000-000000000004';
const REQUEST_A = '92430000-0000-4000-8000-000000000011';
const REQUEST_B = '92430000-0000-4000-8000-000000000012';
const REQUEST_C = '92430000-0000-4000-8000-000000000013';
const DETECTED_AT = '2026-10-01T20:00:00.000Z';
const ACK_AT = '2026-10-01T20:05:00.000Z';

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM security_alert_acknowledgements WHERE alert_id = ${ALERT_ID}`;
  await sql`DELETE FROM security_audit_events WHERE id IN (${REQUEST_A}, ${REQUEST_B}, ${REQUEST_C})`;
  await sql`DELETE FROM security_alert_delivery_attempts WHERE alert_id = ${ALERT_ID}`;
  await sql`DELETE FROM security_alert_outbox WHERE alert_id = ${ALERT_ID}`;
  await sql`DELETE FROM security_detection_history WHERE detection_id = ${DETECTION_ID}`;
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
      '2026-10-01T19:50:00.000Z',
      '2026-10-01T19:55:00.000Z',
      '2026-10-01T19:56:00.000Z',
      3,
      NULL
    )
  `;

  await sql`
    INSERT INTO security_alert_outbox (
      alert_id,
      source_detection_history_id,
      routing_policy_revision,
      schema_version,
      source_detection_type,
      severity,
      primary_owner,
      detected_at,
      acknowledge_by,
      escalation_owner,
      escalate_at,
      created_at
    )
    VALUES (
      ${ALERT_ID},
      ${DETECTION_ID},
      'routing-v1',
      'security-alert-delivery-v1',
      'repeated_privileged_denials',
      'high',
      'security_duty',
      ${DETECTED_AT},
      '2026-10-01T20:10:00.000Z',
      'incident_commander',
      '2026-10-01T20:20:00.000Z',
      ${DETECTED_AT}
    )
  `;
}

function input(overrides = {}) {
  return {
    requestId: REQUEST_A,
    alertId: ALERT_ID,
    acknowledgedAt: ACK_AT,
    subject: OPERATOR_ID,
    role: 'operator',
    ...overrides,
  };
}

after(async () => {
  if (sql) {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_fail_security_alert_ack ON security_alert_acknowledgements');
    await sql.unsafe('DROP FUNCTION IF EXISTS test_fail_security_alert_ack()');
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('acknowledgement and canonical audit fact persist atomically', {
  skip: !enabled,
}, async () => {
  await seedAlert();

  const result = await acknowledgement.acknowledgeSecurityAlert(input());
  assert.equal(result.status, 'ACKNOWLEDGED');
  assert.equal(result.auditEventId, REQUEST_A);

  const [row] = await sql`
    SELECT
      a.alert_id,
      a.acknowledged_at,
      a.acknowledged_by_subject,
      a.acknowledged_by_role,
      a.audit_event_id,
      e.event_type,
      e.actor_subject,
      e.actor_role,
      e.action,
      e.target_scope,
      e.target_ref,
      e.outcome,
      e.reason
    FROM security_alert_acknowledgements a
    JOIN security_audit_events e ON e.id = a.audit_event_id
    WHERE a.alert_id = ${ALERT_ID}
  `;

  assert.equal(row.alert_id, ALERT_ID);
  assert.equal(row.acknowledged_at.toISOString(), ACK_AT);
  assert.equal(row.acknowledged_by_subject, OPERATOR_ID);
  assert.equal(row.acknowledged_by_role, 'operator');
  assert.equal(row.audit_event_id, REQUEST_A);
  assert.equal(row.event_type, 'security_incident_access');
  assert.equal(row.actor_subject, OPERATOR_ID);
  assert.equal(row.actor_role, 'operator');
  assert.equal(row.action, 'security.incident.coordinate');
  assert.equal(row.target_scope, 'security_incident');
  assert.equal(row.target_ref, ALERT_ID);
  assert.equal(row.outcome, 'allowed');
  assert.equal(row.reason, 'allowed');
});

test('duplicate replay is idempotent while conflicting acknowledgement fails closed', {
  skip: !enabled,
}, async () => {
  await seedAlert();
  assert.equal(
    (await acknowledgement.acknowledgeSecurityAlert(input())).status,
    'ACKNOWLEDGED',
  );

  const duplicate = await acknowledgement.acknowledgeSecurityAlert(input({
    requestId: REQUEST_B,
  }));
  assert.equal(duplicate.status, 'DUPLICATE');
  assert.equal(duplicate.auditEventId, REQUEST_A);

  const conflict = await acknowledgement.acknowledgeSecurityAlert(input({
    requestId: REQUEST_C,
    subject: ADMIN_ID,
    role: 'admin',
  }));
  assert.deepEqual(conflict, {
    status: 'CONFLICT',
    alertId: null,
    acknowledgedAt: null,
    acknowledgedBySubject: null,
    acknowledgedByRole: null,
    auditEventId: null,
  });

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM security_alert_acknowledgements WHERE alert_id = ${ALERT_ID}) AS acknowledgements,
      (SELECT count(*)::int FROM security_audit_events WHERE id IN (${REQUEST_A}, ${REQUEST_B}, ${REQUEST_C})) AS audits
  `;
  assert.equal(counts.acknowledgements, 1);
  assert.equal(counts.audits, 1);
});

test('chronology and unsupported role fail closed before any audit write', {
  skip: !enabled,
}, async () => {
  await seedAlert();

  assert.equal(
    (await acknowledgement.acknowledgeSecurityAlert(input({
      acknowledgedAt: '2026-10-01T19:59:59.000Z',
    }))).status,
    'INVALID_TIMESTAMP',
  );
  assert.equal(
    (await acknowledgement.acknowledgeSecurityAlert(input({
      role: 'support',
    }))).status,
    'INVALID_INPUT',
  );

  const [count] = await sql`
    SELECT count(*)::int AS count
    FROM security_audit_events
    WHERE id = ${REQUEST_A}
  `;
  assert.equal(count.count, 0);
});

test('ack insert failure rolls back the audit event in the same transaction', {
  skip: !enabled,
}, async () => {
  await seedAlert();

  await sql.unsafe(`
    CREATE FUNCTION test_fail_security_alert_ack()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $ack924$
    BEGIN
      RAISE EXCEPTION 'test-only acknowledgement persistence failure';
    END;
    $ack924$;
  `);
  await sql.unsafe(`
    CREATE TRIGGER test_fail_security_alert_ack
    BEFORE INSERT ON security_alert_acknowledgements
    FOR EACH ROW
    EXECUTE FUNCTION test_fail_security_alert_ack();
  `);

  try {
    const result = await acknowledgement.acknowledgeSecurityAlert(input());
    assert.equal(result.status, 'DATABASE_UNAVAILABLE');

    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM security_alert_acknowledgements WHERE alert_id = ${ALERT_ID}) AS acknowledgements,
        (SELECT count(*)::int FROM security_audit_events WHERE id = ${REQUEST_A}) AS audits
    `;
    assert.equal(counts.acknowledgements, 0);
    assert.equal(counts.audits, 0);
  } finally {
    await sql.unsafe('DROP TRIGGER IF EXISTS test_fail_security_alert_ack ON security_alert_acknowledgements');
    await sql.unsafe('DROP FUNCTION IF EXISTS test_fail_security_alert_ack()');
  }
});
