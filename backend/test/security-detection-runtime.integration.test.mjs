import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_DETECTION_RUNTIME_DB_INTEGRATION === '1';

const ACTOR_ID = 'd5250000-0000-4000-8000-000000000001';

let sql = null;
let persistSecurityAuditEvent = null;
let runSecurityDetectionScan = null;
let summarizeSecurityDetectionRuntimeResult = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, auditModule, runtimeModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/security/security-audit-repository.js'),
      import('../dist/api/security/security-detection-runtime.js'),
      import('../dist/db/index.js'),
    ]);

  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  persistSecurityAuditEvent = auditModule.persistSecurityAuditEvent;
  runSecurityDetectionScan = runtimeModule.runSecurityDetectionScan;
  summarizeSecurityDetectionRuntimeResult =
    runtimeModule.summarizeSecurityDetectionRuntimeResult;
  closeDatabase = dbModule.closeDatabase;
}

function policy(overrides = {}) {
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
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    schemaVersion: 'security-detection-runtime-v1',
    policyRevision: 'test.policy.v1',
    windowStart: '2026-09-30T09:59:00.000Z',
    windowEnd: '2026-09-30T10:02:00.000Z',
    maxEvents: 20,
    policy: policy(),
    ...overrides,
  };
}

function denialEvent(index) {
  const seconds = index * 20;
  return {
    eventType: 'privileged_authority_decision',
    occurredAt: `2026-09-30T10:00:${String(seconds).padStart(2, '0')}.000Z`,
    actor: {
      kind: 'privileged_human',
      subject: ACTOR_ID,
      role: 'support',
    },
    action: 'moderation.queue.read',
    target: {
      scope: 'support_case',
      ref: `detect525:case-${index}`,
    },
    outcome: 'denied',
    reason: 'action_not_allowed',
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_audit_events
    WHERE target_ref LIKE 'detect525:%'
  `;
}

async function seedDenials(count = 3) {
  const ids = [];
  for (let index = 0; index < count; index += 1) {
    const result = await persistSecurityAuditEvent(denialEvent(index));
    assert.equal(result.ok, true);
    if (result.ok) ids.push(result.id);
  }
  return ids;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('runtime reads canonical durable audit events and evaluates the existing detector', {
  skip: !enabled,
}, async () => {
  await cleanup();
  const persistedIds = await seedDenials(3);

  const before = await sql`
    SELECT count(*)::int AS count
    FROM security_audit_events
    WHERE target_ref LIKE 'detect525:%'
  `;

  const result = await runSecurityDetectionScan(request());
  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;

  assert.equal(result.eventCount, 3);
  assert.deepEqual(
    [...result.evaluatedEventIds].sort(),
    [...persistedIds].sort(),
  );
  assert.deepEqual(result.detections, [{
    type: 'repeated_privileged_denials',
    actorKey: `privileged_human:${ACTOR_ID}`,
    windowStart: '2026-09-30T10:00:00.000Z',
    windowEnd: '2026-09-30T10:00:40.000Z',
    count: 3,
  }]);

  const afterRows = await sql`
    SELECT count(*)::int AS count
    FROM security_audit_events
    WHERE target_ref LIKE 'detect525:%'
  `;
  assert.equal(afterRows[0].count, before[0].count);
});

test('worker-safe summary strips actor keys and target references', {
  skip: !enabled,
}, async () => {
  await cleanup();
  const persistedIds = await seedDenials(3);

  const result = await runSecurityDetectionScan(request());
  const summary = summarizeSecurityDetectionRuntimeResult(result);
  const serialized = JSON.stringify(summary);

  assert.equal(summary.status, 'EVALUATED');
  assert.equal(summary.detectionCount, 1);
  assert.deepEqual(summary.detectionTypes, {
    repeated_privileged_denials: 1,
    rapid_multi_target_access: 0,
    machine_privileged_authority_attempt: 0,
  });

  assert.equal(serialized.includes(ACTOR_ID), false);
  assert.equal(serialized.includes('detect525:case-'), false);
  assert.equal(serialized.includes('actorKey'), false);
  for (const id of persistedIds) {
    assert.equal(serialized.includes(id), false);
  }
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'evaluatedEventIds'), false);
});

test('invalid detector policy fails before being reported as an empty successful scan', {
  skip: !enabled,
}, async () => {
  await cleanup();
  await seedDenials(3);

  const result = await runSecurityDetectionScan(request({
    policy: policy({
      repeatedDenials: {
        enabled: true,
        threshold: 0,
        windowSeconds: 60,
      },
    }),
  }));

  assert.deepEqual(result, {
    status: 'INVALID_POLICY',
    detections: [],
  });
});

test('event bound fails closed rather than truncating evidence', {
  skip: !enabled,
}, async () => {
  await cleanup();
  await seedDenials(3);

  const result = await runSecurityDetectionScan(request({ maxEvents: 2 }));
  assert.deepEqual(result, {
    status: 'EVENT_LIMIT_EXCEEDED',
    retryable: false,
    policyRevision: 'test.policy.v1',
    windowStart: '2026-09-30T09:59:00.000Z',
    windowEnd: '2026-09-30T10:02:00.000Z',
    maxEvents: 2,
    detections: [],
  });
});

test('explicit scan window controls source selection without hidden clock reads', {
  skip: !enabled,
}, async () => {
  await cleanup();
  await seedDenials(3);

  const result = await runSecurityDetectionScan(request({
    windowStart: '2026-09-30T10:00:21.000Z',
    windowEnd: '2026-09-30T10:02:00.000Z',
  }));

  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;
  assert.equal(result.eventCount, 1);
  assert.deepEqual(result.detections, []);
});

test('adjacent scan windows do not double-count an event exactly at windowEnd', {
  skip: !enabled,
}, async () => {
  await cleanup();
  await seedDenials(3);

  const result = await runSecurityDetectionScan(request({
    windowStart: '2026-09-30T10:00:00.000Z',
    windowEnd: '2026-09-30T10:00:40.000Z',
  }));

  assert.equal(result.status, 'EVALUATED');
  if (result.status !== 'EVALUATED') return;

  // Events at :00 and :20 belong to this half-open window.
  // The event exactly at :40 belongs to the next window.
  assert.equal(result.eventCount, 2);
  assert.deepEqual(result.detections, []);
});

test('audit source outage is visible and never becomes an empty successful evaluation', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    ALTER TABLE security_audit_events
    RENAME TO security_audit_events_detection_unavailable_test
  `;

  try {
    const result = await runSecurityDetectionScan(request());
    assert.deepEqual(result, {
      status: 'SOURCE_UNAVAILABLE',
      retryable: true,
      detections: [],
    });
  } finally {
    await sql`
      ALTER TABLE security_audit_events_detection_unavailable_test
      RENAME TO security_audit_events
    `;
  }
});
