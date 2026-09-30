import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.SECURITY_AUDIT_DB_INTEGRATION === '1';

let sql = null;
let persistSecurityAuditEvent = null;
let composePrivilegedAuditEvent = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, repoModule, compositionModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/security-audit-repository.js'),
    import('../dist/api/security/security-audit-composition.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
  persistSecurityAuditEvent = repoModule.persistSecurityAuditEvent;
  composePrivilegedAuditEvent = compositionModule.composePrivilegedAuditEvent;
  closeDatabase = dbModule.closeDatabase;
}

const SUBJECT = 'a1980000-0000-4000-8000-000000000001';

function validEvent(overrides = {}) {
  return {
    eventType: 'privileged_authority_decision',
    occurredAt: '2026-09-30T10:00:00.000Z',
    actor: {
      kind: 'privileged_human',
      subject: SUBJECT,
      role: 'admin',
    },
    action: 'moderation.queue.read',
    target: {
      scope: 'support_case',
      ref: 'audit198:case-1',
    },
    outcome: 'allowed',
    reason: 'allowed',
    ...overrides,
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM security_audit_events
    WHERE target_ref LIKE 'audit198:%'
  `;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('canonical event persists exactly in the dedicated audit table', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const result = await persistSecurityAuditEvent(validEvent());
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const [row] = await sql`
    SELECT
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
      reason,
      stored_at
    FROM security_audit_events
    WHERE id = ${result.id}
  `;

  assert.equal(row.schema_version, 'security-audit-v1');
  assert.equal(row.event_type, 'privileged_authority_decision');
  assert.equal(row.occurred_at.toISOString(), '2026-09-30T10:00:00.000Z');
  assert.equal(row.actor_kind, 'privileged_human');
  assert.equal(row.actor_subject, SUBJECT);
  assert.equal(row.actor_role, 'admin');
  assert.equal(row.action, 'moderation.queue.read');
  assert.equal(row.target_scope, 'support_case');
  assert.equal(row.target_ref, 'audit198:case-1');
  assert.equal(row.outcome, 'allowed');
  assert.equal(row.reason, 'allowed');
  assert.equal(row.stored_at.toISOString(), result.storedAt);
});

test('repository accepts the exact canonical domain event returned by the composer', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const composed = composePrivilegedAuditEvent(
    {
      status: 'AUTHORIZED',
      subject: SUBJECT,
      role: 'admin',
      action: 'moderation.queue.read',
    },
    'moderation.queue.read',
    {
      scope: 'support_case',
      ref: 'audit198:canonical-domain',
    },
    '2026-09-30T10:00:00.000Z',
  );

  assert.equal(composed.status, 'COMPOSED');
  if (composed.status !== 'COMPOSED') return;

  const result = await persistSecurityAuditEvent(composed.event);
  assert.equal(result.ok, true);

  const [{ count }] = await sql`
    SELECT count(*)::int AS count
    FROM security_audit_events
    WHERE target_ref = 'audit198:canonical-domain'
  `;
  assert.equal(count, 1);

  const rejected = await persistSecurityAuditEvent({
    ...composed.event,
    token: 'must-never-broaden-canonical-audit',
  });
  assert.deepEqual(rejected, {
    ok: false,
    error: 'INVALID_AUDIT_EVENT',
    retryable: false,
  });
});

test('repository rejects extra or malformed audit data before persistence', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const extra = await persistSecurityAuditEvent({
    ...validEvent(),
    requestBody: { secret: 'must-never-persist' },
  });
  assert.deepEqual(extra, {
    ok: false,
    error: 'INVALID_AUDIT_EVENT',
    retryable: false,
  });

  const invalidActor = await persistSecurityAuditEvent(validEvent({
    actor: {
      kind: 'privileged_human',
      subject: SUBJECT,
      role: 'root',
    },
  }));
  assert.equal(invalidActor.ok, false);
  assert.equal(invalidActor.error, 'INVALID_AUDIT_EVENT');

  const [{ count }] = await sql`
    SELECT count(*)::int AS count
    FROM security_audit_events
    WHERE target_ref LIKE 'audit198:%'
  `;
  assert.equal(count, 0);
});

test('database constraints fail closed if canonical repository validation is bypassed', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await assert.rejects(sql`
    INSERT INTO security_audit_events (
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
    ) VALUES (
      'security-audit-v1',
      'privileged_authority_decision',
      '2026-09-30T10:00:00.000Z',
      'privileged_human',
      ${SUBJECT},
      'root',
      'moderation.queue.read',
      'support_case',
      'audit198:invalid-role',
      'allowed',
      'allowed'
    )
  `);

  await assert.rejects(sql`
    INSERT INTO security_audit_events (
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
    ) VALUES (
      'security-audit-v1',
      'privileged_authority_decision',
      '2026-09-30T10:00:00.000Z',
      'anonymous',
      NULL,
      NULL,
      'moderation.queue.read',
      'system',
      NULL,
      'allowed',
      'action_not_allowed'
    )
  `);
});

test('durable shape stays bounded and does not acquire extra personal/request metadata', {
  skip: !enabled,
}, async () => {
  const rows = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'security_audit_events'
    ORDER BY ordinal_position
  `;

  assert.deepEqual(
    rows.map((row) => row.column_name),
    [
      'id',
      'schema_version',
      'event_type',
      'occurred_at',
      'actor_kind',
      'actor_subject',
      'actor_role',
      'action',
      'target_scope',
      'target_ref',
      'outcome',
      'reason',
      'stored_at',
    ],
  );

  for (const forbidden of [
    'email',
    'ip',
    'ip_address',
    'user_agent',
    'request_body',
    'token',
    'notes',
  ]) {
    assert.equal(rows.some((row) => row.column_name === forbidden), false);
  }
});

test('sink unavailability returns failure and never reports a successful durable audit', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`ALTER TABLE security_audit_events RENAME TO security_audit_events_unavailable_test`;
  try {
    const result = await persistSecurityAuditEvent(validEvent({
      target: { scope: 'support_case', ref: 'audit198:sink-down' },
    }));

    assert.deepEqual(result, {
      ok: false,
      error: 'DATABASE_UNAVAILABLE',
      retryable: true,
    });
  } finally {
    await sql`ALTER TABLE security_audit_events_unavailable_test RENAME TO security_audit_events`;
  }
});
