import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function source(relativePath) {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('AI-A/R4 database write guard covers fresh and historical database paths without destructive cleanup', async () => {
  const [schema, migration, scheduleText] = await Promise.all([
    source('backend/db/schema/ai.ts'),
    source('backend/db/migrations/0012_ai_zero_durable_write_guard.sql'),
    source('config/privacy/retention-schedule.json'),
  ]);
  const schedule = JSON.parse(scheduleText);
  const row = schedule.categories.find((entry) => entry.id === 'ai_messages');

  assert.match(schema, /check\('chk_ai_messages_no_durable_persistence', sql`false`\)/);
  assert.match(migration, /CHECK \(false\) NOT VALID/);
  assert.match(migration, /VALIDATE CONSTRAINT "chk_ai_messages_no_durable_persistence"/);
  assert.match(migration, /IF NOT EXISTS \(SELECT 1 FROM "ai_messages" LIMIT 1\)/);

  for (const destructive of [
    'DELETE FROM "ai_messages"',
    'TRUNCATE TABLE "ai_messages"',
    'DROP TABLE "ai_messages"',
  ]) {
    assert.equal(migration.includes(destructive), false, destructive);
  }

  assert.equal(
    row.databaseWritePreventionStatus,
    'IMPLEMENTED_AND_RUNTIME_ATTESTED_BY_READINESS_PROBE',
  );
  assert.equal(row.databaseWritePreventionConstraint, 'chk_ai_messages_no_durable_persistence');
  assert.match(row.databaseWritePreventionBoundary, /LEGACY_ROWS_PRESERVED/);
  assert.equal(row.runtimeAttestation.status, 'IMPLEMENTED_READ_ONLY');
  assert.equal(row.runtimeAttestation.constraint, 'chk_ai_messages_no_durable_persistence');
  assert.deepEqual(row.runtimeAttestation.verifies, [
    'CONSTRAINT_PRESENT',
    'CHECK_EXPRESSION_FALSE',
    'CONSTRAINT_VALIDATION_STATE_REPORTED',
  ]);
  assert.equal(row.purgeEvidence, 'NEGATIVE_EVIDENCE_REQUIRED');
});
