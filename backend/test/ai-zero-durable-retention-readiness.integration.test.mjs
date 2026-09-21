import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AI_ZERO_DURABLE_RETENTION_DB_INTEGRATION === '1';

const MESSAGE_ID = 'a1000000-0000-4000-8000-000000000801';
const GUARD_CONSTRAINT = 'chk_ai_messages_no_durable_persistence';

let sql = null;
let inspectAiZeroDurableRetention = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, readinessModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/ai-zero-durable-retention-readiness.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  inspectAiZeroDurableRetention = readinessModule.inspectAiZeroDurableRetention;
  closeDatabase = dbModule.closeDatabase;
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM ai_messages WHERE id = ${MESSAGE_ID}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('AI zero-durable database guard rejects new durable rows on a fresh baseline', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const before = await inspectAiZeroDurableRetention();
  assert.equal(before.ok, true, `initial readiness failed: ${JSON.stringify(before)}`);
  assert.equal(before.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(before.durableRowCount, 0);
  assert.equal(before.claimsRepositoryRuntimePersistenceGuardImplemented, true);
  assert.equal(before.claimsDatabaseWritePreventionImplemented, true);
  assert.equal(before.claimsDatabaseWritePreventionVerifiedAtRuntime, false);
  assert.equal(before.claimsWritePreventionImplemented, false);

  const guards = await sql`
    SELECT
      c.convalidated AS validated,
      pg_get_constraintdef(c.oid, true) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'ai_messages'
      AND c.conname = ${GUARD_CONSTRAINT}
      AND c.contype = 'c'
  `;

  assert.equal(guards.length, 1, 'fresh baseline must contain the AI zero-durable CHECK guard');
  assert.equal(guards[0].validated, true);
  assert.equal(guards[0].definition, 'CHECK (false)');

  await assert.rejects(
    async () => {
      await sql`
        INSERT INTO ai_messages (id, category, content)
        VALUES (${MESSAGE_ID}, 'test-only', 'durable-row-must-be-rejected')
      `;
    },
    (error) => {
      assert.equal(error?.code, '23514');
      assert.equal(error?.constraint_name, GUARD_CONSTRAINT);
      return true;
    },
  );

  const [persisted] = await sql`
    SELECT count(*)::int AS count
    FROM ai_messages
    WHERE id = ${MESSAGE_ID}
  `;
  assert.equal(persisted.count, 0);

  const afterAttempt = await inspectAiZeroDurableRetention();
  assert.equal(afterAttempt.ok, true);
  assert.equal(afterAttempt.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(afterAttempt.durableRowCount, 0);
  assert.equal(afterAttempt.claimsPurgeExecuted, false);
});
