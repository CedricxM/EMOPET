import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  inspectAiZeroDurableRetention,
} from '../dist/api/services/ai-zero-durable-retention-readiness.js';

function snapshot(durableRowCount, guard = {}) {
  return {
    durableRowCount,
    databaseWriteGuard: {
      present: guard.present ?? true,
      expression: guard.expression ?? 'false',
      validated: guard.validated ?? true,
    },
  };
}

test('AI zero-durable readiness is read-only and aligned with founder decision R4', async () => {
  const [source, schedule] = await Promise.all([
    readFile(
      new URL('../api/services/ai-zero-durable-retention-readiness.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../config/privacy/retention-schedule.json', import.meta.url),
      'utf8',
    ).then(JSON.parse),
  ]);

  for (const forbidden of [
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ai_messages',
    'INSERT INTO ai_messages',
    'content:',
    'metadata:',
    'targetUserId:',
    'dogId:',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /pg_get_expr\(c\.conbin, c\.conrelid, true\)/);
  assert.match(source, /chk_ai_messages_no_durable_persistence/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsRepositoryRuntimePersistenceGuardImplemented: true/);
  assert.match(source, /claimsDatabaseWritePreventionImplemented: true/);

  assert.equal(
    schedule.decisions.R4,
    'AI_MESSAGES_NO_DURABLE_RETENTION_UNTIL_SEPARATE_PRODUCT_NEED',
  );
  const row = schedule.categories.find((entry) => entry.id === 'ai_messages');
  assert.deepEqual(row.activeRetention, {
    mode: 'NO_DURABLE_RETENTION',
    value: 0,
    unit: 'SECONDS',
  });
  assert.equal(row.purgeEvidence, 'NEGATIVE_EVIDENCE_REQUIRED');
});

test('AI readiness reports legacy durable rows while independently attesting the live DB write guard', async () => {
  const result = await inspectAiZeroDurableRetention({
    async inspectRetentionState() {
      return snapshot(3, { validated: false });
    },
  });

  assert.deepEqual(result, {
    ok: true,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsWritePreventionImplemented: true,
    claimsRepositoryRuntimePersistenceGuardImplemented: true,
    claimsDatabaseWritePreventionImplemented: true,
    claimsDatabaseWritePreventionVerifiedAtRuntime: true,
    categoryId: 'ai_messages',
    policySeconds: 0,
    status: 'DURABLE_AI_ROWS_PRESENT',
    durableRowCount: 3,
    databaseWriteGuardStatus: 'VERIFIED',
    databaseWriteGuardValidated: false,
    policyBoundary: 'RUNTIME_DATABASE_GUARD_ATTESTATION_IMPLEMENTED_PURGE_NOT_IMPLEMENTED',
  });
});

test('an empty AI table plus exact CHECK(false) guard yields verified write prevention', async () => {
  const result = await inspectAiZeroDurableRetention({
    async inspectRetentionState() {
      return snapshot(0);
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_DURABLE_AI_ROWS_PRESENT');
  assert.equal(result.durableRowCount, 0);
  assert.equal(result.claimsWritePreventionImplemented, true);
  assert.equal(result.claimsRepositoryRuntimePersistenceGuardImplemented, true);
  assert.equal(result.claimsDatabaseWritePreventionImplemented, true);
  assert.equal(result.claimsDatabaseWritePreventionVerifiedAtRuntime, true);
  assert.equal(result.databaseWriteGuardStatus, 'VERIFIED');
  assert.equal(result.databaseWriteGuardValidated, true);
  assert.equal(result.claimsPurgeExecuted, false);
});

test('missing or mismatched database guard is visible and never promoted to verified prevention', async () => {
  for (const databaseWriteGuard of [
    { present: false, expression: null, validated: null },
    { present: true, expression: 'content IS NOT NULL', validated: true },
  ]) {
    const result = await inspectAiZeroDurableRetention({
      async inspectRetentionState() {
        return { durableRowCount: 0, databaseWriteGuard };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.claimsWritePreventionImplemented, false);
    assert.equal(result.claimsDatabaseWritePreventionVerifiedAtRuntime, false);
    assert.equal(result.databaseWriteGuardStatus, 'MISSING_OR_MISMATCHED');
  }
});

test('AI readiness fails closed on malformed repository results and outages', async () => {
  for (const badSnapshot of [
    snapshot(-1),
    snapshot(1.5),
    snapshot(Number.NaN),
    { durableRowCount: 0, databaseWriteGuard: { present: 'yes', expression: 'false', validated: true } },
    { durableRowCount: 0, databaseWriteGuard: { present: true, expression: 7, validated: true } },
  ]) {
    const result = await inspectAiZeroDurableRetention({
      async inspectRetentionState() {
        return badSnapshot;
      },
    });
    assert.deepEqual(result, {
      ok: false,
      mode: 'READ_ONLY_RETENTION_READINESS',
      destructiveActionAuthorized: false,
      claimsPurgeExecuted: false,
      claimsWritePreventionImplemented: false,
      claimsRepositoryRuntimePersistenceGuardImplemented: true,
      claimsDatabaseWritePreventionImplemented: true,
      claimsDatabaseWritePreventionVerifiedAtRuntime: false,
      error: 'invalid_repository_result',
    });
  }

  const unavailable = await inspectAiZeroDurableRetention({
    async inspectRetentionState() {
      throw new Error('database offline');
    },
  });
  assert.deepEqual(unavailable, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsWritePreventionImplemented: false,
    claimsRepositoryRuntimePersistenceGuardImplemented: true,
    claimsDatabaseWritePreventionImplemented: true,
    claimsDatabaseWritePreventionVerifiedAtRuntime: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
