import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.AI_ZERO_DURABLE_RETENTION_DB_INTEGRATION === '1';

const MESSAGE_ID = 'a1000000-0000-4000-8000-000000000801';

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

test('AI zero-durable readiness detects a durable row and does not mutate it', {
  skip: !enabled,
}, async () => {
  await cleanup();

  const empty = await inspectAiZeroDurableRetention();
  assert.equal(empty.ok, true, `empty readiness failed: ${JSON.stringify(empty)}`);
  assert.equal(empty.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(empty.durableRowCount, 0);
  assert.equal(empty.claimsWritePreventionImplemented, false);

  await sql`
    INSERT INTO ai_messages (id, category, content)
    VALUES (${MESSAGE_ID}, 'test-only', 'durable-row-should-be-detected')
  `;

  const present = await inspectAiZeroDurableRetention();
  assert.equal(present.ok, true, `present readiness failed: ${JSON.stringify(present)}`);
  assert.equal(present.status, 'DURABLE_AI_ROWS_PRESENT');
  assert.equal(present.durableRowCount, 1);
  assert.equal(present.destructiveActionAuthorized, false);
  assert.equal(present.claimsPurgeExecuted, false);
  assert.equal(present.claimsWritePreventionImplemented, false);

  const rows = await sql`
    SELECT id, category, content
    FROM ai_messages
    WHERE id = ${MESSAGE_ID}
  `;
  assert.equal(rows.length, 1, 'readiness must not delete the durable AI row');
  assert.equal(rows[0].content, 'durable-row-should-be-detected');

  await cleanup();

  const cleared = await inspectAiZeroDurableRetention();
  assert.equal(cleared.ok, true);
  assert.equal(cleared.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(cleared.durableRowCount, 0);
  assert.equal(cleared.claimsWritePreventionImplemented, false);
});
