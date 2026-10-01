import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_DETECTION_SCHEDULER_DB_INTEGRATION === '1';

const STREAM_ID = 'security-audit-v1';

let sql = null;
let runSecurityDetectionSchedulerTick = null;
let checkSecurityDetectionSchedulerHealth = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, schedulerModule, healthModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/security/security-detection-scheduler.js'),
      import('../dist/api/security/security-detection-health.js'),
      import('../dist/db/index.js'),
    ]);

  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  runSecurityDetectionSchedulerTick =
    schedulerModule.runSecurityDetectionSchedulerTick;
  checkSecurityDetectionSchedulerHealth =
    healthModule.checkSecurityDetectionSchedulerHealth;
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
    policyRevision: 'test.health.870.v1',
    initialWindowStart: null,
    maxEvents: 1000,
    policy: policy(),
    ...overrides,
  };
}

function probe(maxStalenessSeconds = 3600) {
  return checkSecurityDetectionSchedulerHealth({
    schemaVersion: 'security-detection-health-probe-v1',
    maxStalenessSeconds,
  });
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_detection_scheduler_health
    WHERE stream_id = ${STREAM_ID}
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

test('health probe is fail-closed before any scheduler receipt exists', {
  skip: !enabled,
}, async () => {
  await cleanup();

  assert.deepEqual(await probe(), {
    status: 'NO_RECEIPT',
    healthy: false,
  });
});

test('scheduler failures increment, BUSY is observable without inflating failures, success resets', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const firstFailure = await runSecurityDetectionSchedulerTick(request());
  assert.equal(firstFailure.status, 'INITIAL_CURSOR_REQUIRED');

  const secondFailure = await runSecurityDetectionSchedulerTick(request());
  assert.equal(secondFailure.status, 'INITIAL_CURSOR_REQUIRED');

  let [health] = await sql`
    SELECT
      last_status,
      consecutive_failures,
      last_success_at
    FROM security_detection_scheduler_health
    WHERE stream_id = ${STREAM_ID}
  `;

  assert.equal(health.last_status, 'INITIAL_CURSOR_REQUIRED');
  assert.equal(health.consecutive_failures, 2);
  assert.equal(health.last_success_at, null);

  const failedProbe = await probe();
  assert.deepEqual(failedProbe, {
    status: 'LAST_TICK_FAILED',
    healthy: false,
    lastStatus: 'INITIAL_CURSOR_REQUIRED',
    consecutiveFailures: 2,
  });

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
    const busy = await runSecurityDetectionSchedulerTick(request({
      initialWindowStart: new Date(Date.now() - 60_000).toISOString(),
    }));
    assert.equal(busy.status, 'BUSY');
  } finally {
    releaseLock();
    await holder;
  }

  [health] = await sql`
    SELECT
      last_status,
      consecutive_failures,
      last_success_at
    FROM security_detection_scheduler_health
    WHERE stream_id = ${STREAM_ID}
  `;

  assert.equal(health.last_status, 'BUSY');
  assert.equal(health.consecutive_failures, 2);
  assert.equal(health.last_success_at, null);

  const noSuccessProbe = await probe();
  assert.deepEqual(noSuccessProbe, {
    status: 'NO_SUCCESS',
    healthy: false,
    lastStatus: 'BUSY',
    consecutiveFailures: 2,
  });

  const success = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: new Date(Date.now() - 60_000).toISOString(),
  }));
  assert.equal(success.status, 'EVALUATED');

  [health] = await sql`
    SELECT
      last_status,
      consecutive_failures,
      last_success_at
    FROM security_detection_scheduler_health
    WHERE stream_id = ${STREAM_ID}
  `;

  assert.equal(health.last_status, 'EVALUATED');
  assert.equal(health.consecutive_failures, 0);
  assert.ok(health.last_success_at instanceof Date);

  const healthy = await probe();
  assert.deepEqual(healthy, {
    status: 'HEALTHY',
    healthy: true,
    lastStatus: 'EVALUATED',
    consecutiveFailures: 0,
  });
});

test('explicit staleness bound makes an old receipt unhealthy', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const success = await runSecurityDetectionSchedulerTick(request({
    initialWindowStart: new Date(Date.now() - 60_000).toISOString(),
  }));
  assert.equal(success.status, 'EVALUATED');

  await sql`
    UPDATE security_detection_scheduler_health
    SET
      last_attempt_at = CURRENT_TIMESTAMP - interval '2 hours',
      last_success_at = CURRENT_TIMESTAMP - interval '2 hours',
      updated_at = CURRENT_TIMESTAMP - interval '2 hours'
    WHERE stream_id = ${STREAM_ID}
  `;

  const stale = await probe(60);
  assert.deepEqual(stale, {
    status: 'STALE_ATTEMPT',
    healthy: false,
    lastStatus: 'EVALUATED',
    consecutiveFailures: 0,
  });
});

test('probe rejects hidden/default cadence inputs', {
  skip: !enabled,
}, async () => {
  assert.deepEqual(
    await checkSecurityDetectionSchedulerHealth({
      schemaVersion: 'security-detection-health-probe-v1',
      maxStalenessSeconds: 0,
    }),
    { status: 'INVALID_REQUEST', healthy: false },
  );

  assert.deepEqual(
    await checkSecurityDetectionSchedulerHealth({
      schemaVersion: 'security-detection-health-probe-v1',
    }),
    { status: 'INVALID_REQUEST', healthy: false },
  );
});
