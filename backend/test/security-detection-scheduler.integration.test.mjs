import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_DETECTION_SCHEDULER_DB_INTEGRATION === '1';

const ACTOR_ID = 'd7690000-0000-4000-8000-000000000001';
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
      enabled: true,
      uniqueTargetThreshold: 3,
      windowSeconds: 60,
    },
    machinePrivilegedAttempts: {
      enabled: true,
    },
  };
}

function request(overrides = {}) {
  return {
    schemaVersion: 'security-detection-scheduler-v1',
    policyRevision: 'test.scheduler.v1',
    initialWindowStart: new Date(Date.now() - 120_000).toISOString(),
    maxEvents: 1000,
    policy: policy(),
    ...overrides,
  };
}

function denialEvent(index, occurredAt) {
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
      ref: `sched769:case-${index}`,
    },
    outcome: 'denied',
    reason: 'action_not_allowed',
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_audit_events
    WHERE target_ref LIKE 'sched769:%'
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

test('first successful tick creates cursor and next tick resumes exactly at prior end', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const first = await runSecurityDetectionSchedulerTick(request());
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;
  assert.equal(first.cursorAdvanced, true);

  const [storedAfterFirst] = await sql`
    SELECT stream_id, last_successful_window_end
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(storedAfterFirst.stream_id, STREAM_ID);
  assert.equal(
    storedAfterFirst.last_successful_window_end.toISOString(),
    first.windowEnd,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  const second = await runSecurityDetectionSchedulerTick(
    request({ initialWindowStart: null }),
  );
  assert.equal(second.status, 'EVALUATED');
  if (second.status !== 'EVALUATED') return;

  assert.equal(second.windowStart, first.windowEnd);
  assert.ok(Date.parse(second.windowEnd) > Date.parse(second.windowStart));
});

test('failed detector scan does not create or advance cursor', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 5_000;
  for (let index = 0; index < 2; index += 1) {
    const persisted = await persistSecurityAuditEvent(
      denialEvent(index, new Date(base + (index * 500)).toISOString()),
    );
    assert.equal(persisted.ok, true);
  }

  const result = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: new Date(base - 5_000).toISOString(),
    maxEvents: 1,
  }));

  assert.equal(result.status, 'SCAN_FAILED');
  if (result.status !== 'SCAN_FAILED') return;
  assert.equal(result.cursorAdvanced, false);
  assert.equal(result.scan.status, 'EVENT_LIMIT_EXCEEDED');

  const [row] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(row.count, 0);
});

test('held advisory lock makes a concurrent tick return BUSY without cursor mutation', {
  skip: !enabled,
}, async () => {
  await cleanup();

  let signalReady;
  let releaseLock;
  const ready = new Promise((resolve) => { signalReady = resolve; });
  const release = new Promise((resolve) => { releaseLock = resolve; });

  const holder = sql.begin(async (tx) => {
    await tx`
      SELECT pg_advisory_xact_lock(hashtextextended(${STREAM_ID}, 0))
    `;
    signalReady();
    await release;
  });

  await ready;

  try {
    const result = await runSecurityDetectionSchedulerTick(request());
    assert.deepEqual(result, {
      status: 'BUSY',
      cursorAdvanced: false,
    });

    const [row] = await sql`
      SELECT count(*)::int AS count
      FROM security_detection_scheduler_state
      WHERE stream_id = ${STREAM_ID}
    `;
    assert.equal(row.count, 0);
  } finally {
    releaseLock();
    await holder;
  }
});

test('scheduler cursor table contains operational cursor state only', {
  skip: !enabled,
}, async () => {
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'security_detection_scheduler_state'
    ORDER BY ordinal_position
  `;

  assert.deepEqual(columns.map((row) => row.column_name), [
    'stream_id',
    'last_successful_window_end',
    'updated_at',
  ]);

  // Cursor columns must remain operational-only. The table name contains
  // "detection"; the columns themselves must not grow detection/identity data.
  for (const row of columns) {
    assert.doesNotMatch(
      row.column_name,
      /actor|target|email|token|detection|payload|policy|subject|user/i,
    );
  }
});

test('missing initial cursor fails closed before any scan state is created', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const result = await runSecurityDetectionSchedulerTick(
    request({ initialWindowStart: null }),
  );
  assert.deepEqual(result, {
    status: 'INITIAL_CURSOR_REQUIRED',
    cursorAdvanced: false,
  });

  const [row] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(row.count, 0);
});
