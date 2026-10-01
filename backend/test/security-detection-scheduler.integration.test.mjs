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

async function persistDenial(index, occurredAt) {
  const persisted = await persistSecurityAuditEvent(
    denialEvent(index, occurredAt),
  );
  assert.equal(persisted.ok, true);
  assert.ok(persisted.ok);
  return persisted.id;
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
      WHERE audit.target_ref LIKE 'sched769:%'
    )
  `;
  await sql`
    DELETE FROM security_detection_evaluated_events
    WHERE audit_event_id IN (
      SELECT id
      FROM security_audit_events
      WHERE target_ref LIKE 'sched769:%'
    )
  `;
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

test('first successful tick freezes monitoring start and next tick resumes exactly at prior end', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const initialWindowStart = new Date(Date.now() - 120_000).toISOString();
  const first = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart,
  }));
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;
  assert.equal(first.cursorAdvanced, true);
  assert.equal(first.lateEventCount, 0);

  const [storedAfterFirst] = await sql`
    SELECT
      stream_id,
      monitoring_started_at,
      last_successful_window_end
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(storedAfterFirst.stream_id, STREAM_ID);
  assert.equal(
    storedAfterFirst.monitoring_started_at.toISOString(),
    initialWindowStart,
  );
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

  const [storedAfterSecond] = await sql`
    SELECT monitoring_started_at
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(
    storedAfterSecond.monitoring_started_at.toISOString(),
    initialWindowStart,
  );
});

test('failed detector scan does not create cursor or evaluation receipts', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 5_000;
  await persistDenial(10, new Date(base).toISOString());
  await persistDenial(11, new Date(base + 500).toISOString());

  const result = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: new Date(base - 5_000).toISOString(),
    maxEvents: 1,
  }));

  assert.equal(result.status, 'SCAN_FAILED');
  if (result.status !== 'SCAN_FAILED') return;
  assert.equal(result.cursorAdvanced, false);
  assert.equal(result.scan.status, 'EVENT_LIMIT_EXCEEDED');

  const [cursor] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(cursor.count, 0);

  const [receipts] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_evaluated_events
  `;
  assert.equal(receipts.count, 0);
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

test('scheduler state and receipt ledger contain operational ids/timestamps only', {
  skip: !enabled,
}, async () => {
  const cursorColumns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'security_detection_scheduler_state'
    ORDER BY ordinal_position
  `;

  assert.deepEqual(cursorColumns.map((row) => row.column_name), [
    'stream_id',
    'last_successful_window_end',
    'updated_at',
    'monitoring_started_at',
  ]);

  const receiptColumns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'security_detection_evaluated_events'
    ORDER BY ordinal_position
  `;

  assert.deepEqual(receiptColumns.map((row) => row.column_name), [
    'audit_event_id',
    'evaluated_at',
  ]);

  for (const row of [...cursorColumns, ...receiptColumns]) {
    assert.doesNotMatch(
      row.column_name,
      /actor|target|email|token|payload|policy|subject|user|alert|detection_body/i,
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

test('successful normal-window evaluation writes one receipt per evaluated audit row', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 60_000;
  const ids = [
    await persistDenial(20, new Date(base).toISOString()),
    await persistDenial(21, new Date(base + 20_000).toISOString()),
  ];

  const result = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: new Date(base - 10_000).toISOString(),
  }));
  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;
  assert.equal(result.eventCount, 2);
  assert.equal(result.lateEventCount, 0);

  const rows = await sql`
    SELECT audit_event_id
    FROM security_detection_evaluated_events
    ORDER BY audit_event_id
  `;
  assert.deepEqual(
    rows.map((row) => row.audit_event_id).sort(),
    [...ids].sort(),
  );
});

test('late committed event is discovered and reevaluated with policy-derived event-time context', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const base = Date.now() - 90_000;
  const initialWindowStart = new Date(base - 10_000).toISOString();

  const firstId = await persistDenial(30, new Date(base).toISOString());
  const secondId = await persistDenial(31, new Date(base + 20_000).toISOString());

  const first = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart,
  }));
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;
  assert.equal(first.detectionCount, 0);
  assert.equal(first.lateEventCount, 0);

  // Commit after the scheduler cursor already moved, but with event time inside
  // the previous monitored interval. An event-time-only cursor would miss it.
  const lateId = await persistDenial(
    32,
    new Date(base + 40_000).toISOString(),
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  const second = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: null,
  }));
  assert.equal(second.status, 'EVALUATED');
  if (second.status !== 'EVALUATED') return;

  assert.equal(second.windowStart, first.windowEnd);
  assert.equal(second.lateEventCount, 1);
  assert.equal(second.lateReevaluationDetectionCount, 1);

  const receipts = await sql`
    SELECT audit_event_id
    FROM security_detection_evaluated_events
    ORDER BY audit_event_id
  `;
  assert.deepEqual(
    receipts.map((row) => row.audit_event_id).sort(),
    [firstId, secondId, lateId].sort(),
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  const third = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: null,
  }));
  assert.equal(third.status, 'EVALUATED');
  if (third.status !== 'EVALUATED') return;
  assert.equal(third.lateEventCount, 0);

  const [receiptCount] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_evaluated_events
  `;
  assert.equal(receiptCount.count, 3);
});

test('late-event overflow fails closed without advancing cursor or marking late receipts', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const initialWindowStart = new Date(Date.now() - 120_000).toISOString();
  const first = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart,
  }));
  assert.equal(first.status, 'EVALUATED');
  if (first.status !== 'EVALUATED') return;

  const priorEnd = first.windowEnd;
  const lateBase = Date.parse(initialWindowStart) + 10_000;
  await persistDenial(40, new Date(lateBase).toISOString());
  await persistDenial(41, new Date(lateBase + 1_000).toISOString());

  const second = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: null,
    maxEvents: 1,
  }));

  assert.deepEqual(second, {
    status: 'LATE_EVENT_LIMIT_EXCEEDED',
    cursorAdvanced: false,
    windowStart: priorEnd,
    windowEnd: second.windowEnd,
    maxEvents: 1,
  });

  const [state] = await sql`
    SELECT last_successful_window_end
    FROM security_detection_scheduler_state
    WHERE stream_id = ${STREAM_ID}
  `;
  assert.equal(state.last_successful_window_end.toISOString(), priorEnd);

  const [receiptCount] = await sql`
    SELECT count(*)::int AS count
    FROM security_detection_evaluated_events
  `;
  assert.equal(receiptCount.count, 0);
});
