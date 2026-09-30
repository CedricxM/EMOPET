import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_AUDIT_EMISSION_DB_INTEGRATION === '1';

const EVENT_ID = '78200000-0000-4000-8000-000000000001';
const ACTOR_ID = '78200000-0000-4000-8000-000000000002';
const SECRET = 'test-only-internal-audit-secret-782-do-not-use-in-production';
const NOW = new Date('2026-09-30T16:30:00.000Z');

let sql = null;
let route = null;
let signInternalAuditServiceToken = null;
let runSecurityDetectionScan = null;
let closeDatabase = null;

if (enabled) {
  const [
    { default: postgres },
    routeModule,
    privilegedAuth,
    detectionModule,
    dbModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/routes/internal-security-audit.js'),
    import('@emopet/privileged-auth'),
    import('../dist/api/security/security-detection-runtime.js'),
    import('../dist/db/index.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  signInternalAuditServiceToken = privilegedAuth.signInternalAuditServiceToken;
  runSecurityDetectionScan = detectionModule.runSecurityDetectionScan;
  closeDatabase = dbModule.closeDatabase;

  route = routeModule.createInternalSecurityAuditRoute({
    now: () => NOW,
    keyProvider: () => ({ secret: SECRET }),
  });
}

function payload() {
  return {
    decision: {
      status: 'AUTHORIZED',
      subject: ACTOR_ID,
      role: 'admin',
      action: 'admin.data.read',
    },
    action: 'admin.data.read',
    target: { scope: 'system', ref: null },
    occurredAt: NOW.toISOString(),
  };
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

async function signedRequest() {
  const body = JSON.stringify(payload());
  const token = await signInternalAuditServiceToken({
    eventId: EVENT_ID,
    body,
    key: { secret: SECRET },
    now: NOW,
  });

  return new Request('http://internal.test/', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body,
  });
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM security_audit_events WHERE id = ${EVENT_ID}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('real internal emission persists once and becomes visible to canonical detection runtime', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const first = await route.fetch(await signedRequest());
  assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), {
    ok: true,
    stored: true,
    duplicate: false,
  });

  const retry = await route.fetch(await signedRequest());
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), {
    ok: true,
    stored: true,
    duplicate: true,
  });

  const rows = await sql`
    SELECT
      id,
      schema_version,
      event_type,
      occurred_at,
      actor_kind,
      actor_subject,
      actor_role,
      action,
      target_scope,
      target_ref,
      outcome,
      reason
    FROM security_audit_events
    WHERE id = ${EVENT_ID}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].schema_version, 'security-audit-v1');
  assert.equal(rows[0].event_type, 'privileged_authority_decision');
  assert.equal(rows[0].occurred_at.toISOString(), NOW.toISOString());
  assert.equal(rows[0].actor_kind, 'privileged_human');
  assert.equal(rows[0].actor_subject, ACTOR_ID);
  assert.equal(rows[0].actor_role, 'admin');
  assert.equal(rows[0].action, 'admin.data.read');
  assert.equal(rows[0].target_scope, 'system');
  assert.equal(rows[0].target_ref, null);
  assert.equal(rows[0].outcome, 'allowed');
  assert.equal(rows[0].reason, 'allowed');

  const detected = await runSecurityDetectionScan({
    schemaVersion: 'security-detection-runtime-v1',
    policyRevision: 'emit782.test.v1',
    windowStart: '2026-09-30T16:29:00.000Z',
    windowEnd: '2026-09-30T16:31:00.000Z',
    maxEvents: 20,
    policy: policy(),
  });

  assert.equal(detected.status, 'EVALUATED');
  if (detected.status !== 'EVALUATED') return;
  assert.equal(detected.eventCount, 1);
  assert.deepEqual(detected.evaluatedEventIds, [EVENT_ID]);
  assert.deepEqual(detected.detections, []);
});
