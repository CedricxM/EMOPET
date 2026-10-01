import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_DETECTION_HISTORY_DB_INTEGRATION === '1';

const ACTOR_ID = 'd8050000-0000-4000-8000-000000000001';
const STREAM_ID = 'security-audit-v1';

let sql = null;
let persistSecurityAuditEvent = null;
let runSecurityDetectionSchedulerTick = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, auditModule, schedulerModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/security/security-audit-repository.js'),
      import('../dist/api/security/security-detection-scheduler.js'),
      import('../dist/db/index.js'),
    ]);

  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  persistSecurityAuditEvent = auditModule.persistSecurityAuditEvent;
  runSecurityDetectionSchedulerTick =
    schedulerModule.runSecurityDetectionSchedulerTick;
  closeDatabase = dbModule.closeDatabase;
}

function policy() {
  return {
    repeatedDenials: {
      enabled: true,
      threshold: 3,
      windowSeconds: 60,
    },
    rapidMultiTargetAccess: {
      enabled: false,
      uniqueTargetThreshold: 3,
      windowSeconds: 60,
    },
    machinePrivilegedAttempts: {
      enabled: false,
    },
  };
}

function request(initialWindowStart, overrides = {}) {
  return {
    schemaVersion: 'security-detection-scheduler-v1',
    policyRevision: 'test.history.805.v1',
    initialWindowStart,
    maxEvents: 1000,
    policy: policy(),
    ...overrides,
  };
}

function denial(index, occurredAt) {
  return {
    eventType: 'privileged_authority_decision',
    occurredAt,
    actor: {
      kind: 'privileged_human',
      subject: ACTOR_ID,
      role: 'support',
    },
    action: 'moderation.queue.read',
    target: {
      scope: 'support_case',
      ref: `hist805:case-${index}`,
    },
    outcome: 'denied',
    reason: 'action_not_allowed',
  };
}

async function persistDenial(index, occurredAt) {
  const result = await persistSecurityAuditEvent(denial(index, occurredAt));
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  return result.id;
}

async function cleanup() {
  if (!sql) return;

  await sql`
    DELETE FROM security_detection_history
    WHERE detection_id IN (
      SELECT DISTINCT history.detection_id
      FROM security_detection_history_events AS history
      JOIN security_audit_events AS audit
        ON audit.id = history.audit_event_id
      WHERE audit.target_ref LIKE 'hist805:%'
    )
  `;
  await sql`
    DELETE FROM security_detection_evaluated_events
    WHERE audit_event_id IN (
      SELECT id
      FROM security_audit_events
      WHERE target_ref LIKE 'hist805:%'
    )
  `;
  await sql`
    DELETE FROM security_audit_events
    WHERE target_ref LIKE 'hist805:%'
  `;
  await sql`
    DELETE FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('expected detection persists bounded history plus exact canonical source ids', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 10_000;
  const ids = [
    await persistDenial(1, new Date(base).toISOString()),
    await persistDenial(2, new Date(base + 1_000).toISOString()),
    await persistDenial(3, new Date(base + 2_000).toISOString()),
  ];

  const result = await runSecurityDetectionSchedulerTick(
    request(new Date(base - 1_000).toISOString()),
  );
  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;
  assert.equal(result.detectionCount, 1);

  const history = await sql`
    SELECT *
    FROM security_detection_history
  `;
  assert.equal(history.length, 1);
  assert.equal(history[0].detector_type, 'repeated_privileged_denials');
  assert.equal(history[0].policy_revision, 'test.history.805.v1');
  assert.equal(history[0].event_count, 3);
  assert.equal(history[0].unique_target_count, null);
  assert.match(history[0].dedupe_key, /^[0-9a-f]{64}$/);

  const evidence = await sql`
    SELECT audit_event_id
    FROM security_detection_history_events
    WHERE detection_id = ${history[0].detection_id}
    ORDER BY audit_event_id
  `;
  assert.deepEqual(
    evidence.map((row) => row.audit_event_id),
    [...ids].sort(),
  );

  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'security_detection_history',
        'security_detection_history_events'
      )
    ORDER BY table_name, ordinal_position
  `;
  const prohibitedColumns = new Set([
    'actor_key',
    'actor_subject',
    'actor_id',
    'target_ref',
    'target_id',
    'email',
    'ip',
    'ip_address',
    'user_agent',
    'token',
    'session_id',
    'payload',
    'request_body',
    'response_body',
    'free_form',
    'note',
    'notes',
    'subject',
  ]);
  for (const { column_name } of columns) {
    assert.equal(
      prohibitedColumns.has(column_name),
      false,
      `unexpected durable actor/target payload column: ${column_name}`,
    );
  }
});

test('no-detection evaluation persists no fake history row', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 10_000;
  await persistDenial(10, new Date(base).toISOString());

  const result = await runSecurityDetectionSchedulerTick(
    request(new Date(base - 1_000).toISOString()),
  );
  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;
  assert.equal(result.detectionCount, 0);

  const [{ count }] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_history
  `;
  assert.equal(count, 0);
});

test('late replay of the same source evidence does not duplicate durable history', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 15_000;
  const ids = [
    await persistDenial(20, new Date(base).toISOString()),
    await persistDenial(21, new Date(base + 1_000).toISOString()),
    await persistDenial(22, new Date(base + 2_000).toISOString()),
  ];

  const first = await runSecurityDetectionSchedulerTick(
    request(new Date(base - 1_000).toISOString()),
  );
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;
  assert.equal(first.detectionCount, 1);

  await sql`
    DELETE FROM security_detection_evaluated_events
    WHERE audit_event_id = ${ids[0]}
  `;

  await new Promise((resolve) => setTimeout(resolve, 20));

  const second = await runSecurityDetectionSchedulerTick(request(null));
  assert.equal(second.status, 'EVALUATED');
  if (second.status !== 'EVALUATED') return;
  assert.equal(second.lateEventCount, 1);
  assert.equal(second.lateReevaluationDetectionCount, 1);

  const [{ count }] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_history
  `;
  assert.equal(count, 1);
});

test('persistence failure rolls back history, evaluated receipts and cursor together', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 10_000;
  await persistDenial(30, new Date(base).toISOString());
  await persistDenial(31, new Date(base + 1_000).toISOString());
  await persistDenial(32, new Date(base + 2_000).toISOString());

  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION fail_detection_history_insert_805()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fail805$
    BEGIN
      RAISE EXCEPTION 'test-only detection history persistence failure';
    END;
    $fail805$;
  `);
  await sql.unsafe(`
    CREATE TRIGGER fail_detection_history_insert_805
    BEFORE INSERT ON security_detection_history
    FOR EACH ROW
    EXECUTE FUNCTION fail_detection_history_insert_805();
  `);

  try {
    const result = await runSecurityDetectionSchedulerTick(
      request(new Date(base - 1_000).toISOString()),
    );
    assert.deepEqual(result, {
      status: 'SCHEDULER_UNAVAILABLE',
      cursorAdvanced: false,
      retryable: true,
    });
  } finally {
    await sql.unsafe(`
      DROP TRIGGER IF EXISTS fail_detection_history_insert_805
        ON security_detection_history;
    `);
    await sql.unsafe(`
      DROP FUNCTION IF EXISTS fail_detection_history_insert_805();
    `);
  }

  const [cursor, receipts, history] = await Promise.all([
    sql`SELECT count(*)::int AS count FROM security_detection_scheduler_state`,
    sql`SELECT count(*)::int AS count FROM security_detection_evaluated_events`,
    sql`SELECT count(*)::int AS count FROM security_detection_history`,
  ]);

  assert.equal(cursor[0].count, 0);
  assert.equal(receipts[0].count, 0);
  assert.equal(history[0].count, 0);
});

test('late committed event creates the missing detection once', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 20_000;
  const initial = new Date(base - 1_000).toISOString();

  await persistDenial(40, new Date(base).toISOString());
  await persistDenial(41, new Date(base + 1_000).toISOString());

  const first = await runSecurityDetectionSchedulerTick(request(initial));
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;
  assert.equal(first.detectionCount, 0);

  await persistDenial(42, new Date(base + 2_000).toISOString());
  await new Promise((resolve) => setTimeout(resolve, 20));

  const second = await runSecurityDetectionSchedulerTick(request(null));
  assert.equal(second.status, 'EVALUATED');
  if (second.status !== 'EVALUATED') return;
  assert.equal(second.lateEventCount, 1);
  assert.equal(second.lateReevaluationDetectionCount, 1);

  const [{ count: afterSecond }] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_history
  `;
  assert.equal(afterSecond, 1);

  await new Promise((resolve) => setTimeout(resolve, 20));
  const third = await runSecurityDetectionSchedulerTick(request(null));
  assert.equal(third.status, 'EVALUATED');

  const [{ count: afterThird }] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_history
  `;
  assert.equal(afterThird, 1);
});

test('invalid direct writes are rejected by bounded DB constraints', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await assert.rejects(sql`
    INSERT INTO security_detection_history (
      dedupe_key,
      detector_type,
      policy_revision,
      evaluation_window_start,
      evaluation_window_end,
      recorded_at,
      event_count
    ) VALUES (
      ${'x'.repeat(64)},
      'invented_detector',
      'test.history.805.v1',
      now() - interval '2 minutes',
      now() - interval '1 minute',
      now(),
      1
    )
  `);

  await assert.rejects(sql`
    INSERT INTO security_detection_history (
      dedupe_key,
      detector_type,
      policy_revision,
      evaluation_window_start,
      evaluation_window_end,
      recorded_at,
      event_count,
      unique_target_count
    ) VALUES (
      ${'a'.repeat(64)},
      'machine_privileged_authority_attempt',
      'test.history.805.v1',
      now() - interval '2 minutes',
      now() - interval '1 minute',
      now(),
      1,
      2
    )
  `);
});
