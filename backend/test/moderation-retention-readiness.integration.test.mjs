import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.MODERATION_RETENTION_DB_INTEGRATION === '1';

const REPORT_FRESH = 'c1000000-0000-4000-8000-000000000701';
const REPORT_OLD = 'c1000000-0000-4000-8000-000000000702';
const REPORT_UNCLOCKED = 'c1000000-0000-4000-8000-000000000703';
const CONTENT_ID = 'd1000000-0000-4000-8000-000000000701';
const COMMUNITY_ID = 'e1000000-0000-4000-8000-000000000701';

let sql = null;
let inspectModerationRetention = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, readinessModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/moderation-retention-readiness.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  inspectModerationRetention = readinessModule.inspectModerationRetention;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM community_reports
    WHERE id IN (
      ${REPORT_FRESH},
      ${REPORT_OLD},
      ${REPORT_UNCLOCKED}
    )
  `;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('moderation readiness counts expired stamped evidence and missing clocks without mutating reports', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO community_reports (
      id,
      content_type,
      content_id,
      community_id,
      reason,
      status,
      final_action_at,
      created_at
    ) VALUES
      (
        ${REPORT_FRESH},
        'post',
        ${CONTENT_ID},
        ${COMMUNITY_ID},
        'spam',
        'closed',
        '2026-02-01T12:00:00.000Z',
        '2026-01-15T12:00:00.000Z'
      ),
      (
        ${REPORT_OLD},
        'post',
        ${CONTENT_ID},
        ${COMMUNITY_ID},
        'spam',
        'closed',
        '2025-09-20T11:00:00.000Z',
        '2025-09-10T12:00:00.000Z'
      ),
      (
        ${REPORT_UNCLOCKED},
        'post',
        ${CONTENT_ID},
        ${COMMUNITY_ID},
        'spam',
        'open',
        NULL,
        '2024-01-01T12:00:00.000Z'
      )
  `;

  const result = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
  );

  assert.equal(result.ok, true, `readiness failed closed: ${JSON.stringify(result)}`);
  assert.equal(result.cutoffAt, '2025-09-21T12:00:00.000Z');
  assert.equal(result.status, 'ROWS_BEYOND_12_MONTHS_PRESENT');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsRuntimeFinalActionStampingImplemented, false);
  assert.equal(result.claimsHistoricalBackfillComplete, false);
  assert.deepEqual(result.counts, {
    total: 3,
    clockedTotal: 2,
    unclockedTotal: 1,
    beyondWindowTotal: 1,
  });

  const rows = await sql`
    SELECT id, status, final_action_at
    FROM community_reports
    WHERE id IN (
      ${REPORT_FRESH},
      ${REPORT_OLD},
      ${REPORT_UNCLOCKED}
    )
    ORDER BY id
  `;

  assert.equal(rows.length, 3, 'readiness must not mutate or delete moderation evidence');
  assert.equal(
    rows.find((row) => row.id === REPORT_UNCLOCKED)?.final_action_at,
    null,
    'readiness must not invent a historical final-action clock',
  );
});
