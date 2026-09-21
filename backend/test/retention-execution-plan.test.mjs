import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  inspectRetentionExecutionPlan,
} from '../dist/api/services/retention-execution-plan.js';

function dependencies(overrides = {}) {
  return {
    async inspectRefresh(evaluationAt) {
      return {
        ok: true,
        mode: 'READ_ONLY_RETENTION_READINESS',
        destructiveActionAuthorized: false,
        claimsPurgeExecuted: false,
        categoryId: 'auth_refresh_sessions',
        evaluationAt,
        status: 'NO_EXPIRED_ROWS',
        counts: {
          expiredTotal: 0,
          detachedExpired: 0,
          linkedExpired: 0,
          revokedExpired: 0,
          unrevokedExpired: 0,
        },
        policyBoundary: 'DELETE_ONLY_AFTER_ORIGINAL_EXPIRY',
      };
    },
    async inspectExactLocation(evaluationAt) {
      return {
        ok: true,
        mode: 'READ_ONLY_RETENTION_READINESS',
        destructiveActionAuthorized: false,
        claimsPurgeExecuted: false,
        claimsSessionEndCompliance: false,
        categoryId: 'exact_location',
        evaluationAt,
        cutoffAt: '2026-09-20T12:00:00.000Z',
        policyMaxHours: 24,
        status: 'NO_ROWS_BEYOND_MAX_WINDOW',
        counts: {
          coordinateBearingTotal: 0,
          completeCoordinatePairs: 0,
          partialCoordinateRows: 0,
          beyondMaxWindowTotal: 0,
          beyondMaxWindowCompletePairs: 0,
          beyondMaxWindowPartialRows: 0,
        },
        policyBoundary: 'MAX_24_HOURS_ONLY_SESSION_END_MAY_REQUIRE_EARLIER_DELETION',
      };
    },
    async inspectDetailed(evaluationAt) {
      return {
        ok: true,
        mode: 'READ_ONLY_RETENTION_READINESS',
        destructiveActionAuthorized: false,
        claimsPurgeExecuted: false,
        claimsAggregationCompleted: false,
        categoryIds: ['sensor_preprocessed_detailed', 'eli_inferred_detailed'],
        evaluationAt,
        cutoffAt: '2023-09-21T12:00:00.000Z',
        expiryBasis: 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS',
        policyMonths: 36,
        status: 'NO_DETAILED_ROWS_BEYOND_36_MONTHS',
        counts: {
          sensorDetailedTotal: 0,
          sensorBeyondWindow: 0,
          eliDetailedTotal: 0,
          eliBeyondWindow: 0,
        },
        policyBoundary: 'DETAILED_ONLY_AGGREGATION_AND_PURGE_EXECUTION_NOT_VERIFIED',
      };
    },
    async inspectModeration(evaluationAt) {
      return {
        ok: true,
        mode: 'READ_ONLY_RETENTION_READINESS',
        destructiveActionAuthorized: false,
        claimsPurgeExecuted: false,
        claimsRuntimeFinalActionStampingImplemented: false,
        claimsHistoricalBackfillComplete: false,
        categoryId: 'moderation_evidence',
        evaluationAt,
        cutoffAt: '2025-09-21T12:00:00.000Z',
        expiryBasis: 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS',
        policyMonths: 12,
        status: 'NO_ROWS_BEYOND_12_MONTHS',
        counts: {
          total: 0,
          clockedTotal: 0,
          unclockedTotal: 0,
          beyondWindowTotal: 0,
        },
        policyBoundary:
          'FINAL_ACTION_CLOCK_READINESS_ONLY_RUNTIME_STAMPING_AND_HISTORICAL_BACKFILL_NOT_VERIFIED',
      };
    },
    async inspectAi() {
      return {
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
        status: 'NO_DURABLE_AI_ROWS_PRESENT',
        durableRowCount: 0,
        databaseWriteGuardStatus: 'VERIFIED',
        databaseWriteGuardValidated: true,
        policyBoundary: 'RUNTIME_DATABASE_GUARD_ATTESTATION_IMPLEMENTED_PURGE_NOT_IMPLEMENTED',
      };
    },
    ...overrides,
  };
}

test('global retention execution plan is aggregate-only, read-only and non-authorising', async () => {
  const source = await readFile(
    new URL('../api/services/retention-execution-plan.ts', import.meta.url),
    'utf8',
  );

  for (const forbidden of [
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ',
    'INSERT INTO',
    'TRUNCATE',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /mode: 'DRY_RUN_ONLY'/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsCrossCategorySnapshotAtomic: false/);
  assert.match(source, /NO_ROW_IDS_NO_MUTATION_NO_EXECUTION_AUTHORITY/);
});

test('no observed expiry signals produces a clean but still non-authorising plan', async () => {
  const result = await inspectRetentionExecutionPlan(
    '2026-09-21T12:00:00Z',
    dependencies(),
  );

  assert.deepEqual(result, {
    ok: true,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsCrossCategorySnapshotAtomic: false,
    evaluationAt: '2026-09-21T12:00:00.000Z',
    status: 'NO_RETENTION_SIGNALS',
    observedSignalCountTotal: 0,
    signals: [],
    probeBoundaries: {
      exactLocationSessionEndComplete: false,
      detailedAggregationComplete: false,
      moderationRuntimeFinalActionStampingComplete: false,
      moderationHistoricalBackfillComplete: false,
    },
    policyBoundary: 'AGGREGATED_READ_ONLY_SIGNALS_NO_ROW_IDS_NO_MUTATION_NO_EXECUTION_AUTHORITY',
  });
});

test('observed expiry signals are composed with blockers rather than execution authority', async () => {
  const base = dependencies();
  const result = await inspectRetentionExecutionPlan(
    '2026-09-21T12:00:00Z',
    dependencies({
      async inspectRefresh(evaluationAt) {
        const value = await base.inspectRefresh(evaluationAt);
        value.counts = {
          expiredTotal: 2,
          detachedExpired: 1,
          linkedExpired: 1,
          revokedExpired: 2,
          unrevokedExpired: 0,
        };
        value.status = 'EXPIRED_ROWS_PRESENT';
        return value;
      },
      async inspectExactLocation(evaluationAt) {
        const value = await base.inspectExactLocation(evaluationAt);
        value.counts = {
          coordinateBearingTotal: 4,
          completeCoordinatePairs: 4,
          partialCoordinateRows: 0,
          beyondMaxWindowTotal: 3,
          beyondMaxWindowCompletePairs: 3,
          beyondMaxWindowPartialRows: 0,
        };
        value.status = 'ROWS_BEYOND_MAX_WINDOW_PRESENT';
        return value;
      },
      async inspectDetailed(evaluationAt) {
        const value = await base.inspectDetailed(evaluationAt);
        value.counts = {
          sensorDetailedTotal: 8,
          sensorBeyondWindow: 4,
          eliDetailedTotal: 7,
          eliBeyondWindow: 2,
        };
        value.status = 'DETAILED_ROWS_BEYOND_36_MONTHS_PRESENT';
        return value;
      },
      async inspectModeration(evaluationAt) {
        const value = await base.inspectModeration(evaluationAt);
        value.counts = {
          total: 6,
          clockedTotal: 5,
          unclockedTotal: 1,
          beyondWindowTotal: 2,
        };
        value.status = 'ROWS_BEYOND_12_MONTHS_PRESENT';
        return value;
      },
      async inspectAi() {
        const value = await base.inspectAi();
        value.status = 'DURABLE_AI_ROWS_PRESENT';
        value.durableRowCount = 1;
        value.claimsWritePreventionImplemented = false;
        value.claimsDatabaseWritePreventionVerifiedAtRuntime = false;
        value.databaseWriteGuardStatus = 'MISSING_OR_MISMATCHED';
        value.databaseWriteGuardValidated = null;
        return value;
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'RETENTION_SIGNALS_PRESENT_EXECUTION_BLOCKED');
  assert.equal(result.observedSignalCountTotal, 14);
  assert.deepEqual(
    result.signals.map((item) => [item.categoryId, item.observedCount]),
    [
      ['auth_refresh_sessions', 2],
      ['exact_location', 3],
      ['sensor_preprocessed_detailed', 4],
      ['eli_inferred_detailed', 2],
      ['moderation_evidence', 2],
      ['ai_messages', 1],
    ],
  );
  assert.deepEqual(result.signals[2].blockers, [
    'AGGREGATION_NOT_VERIFIED',
    'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED',
  ]);
  assert.deepEqual(result.signals[4].blockers, [
    'FINAL_ACTION_RUNTIME_STAMPING_NOT_IMPLEMENTED',
    'HISTORICAL_FINAL_ACTION_BACKFILL_NOT_VERIFIED',
    'HOLD_EVALUATION_NOT_COMPOSED',
    'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED',
  ]);
  assert.deepEqual(result.signals[5].blockers, [
    'DATABASE_WRITE_GUARD_NOT_VERIFIED',
    'LEGACY_AI_PURGE_NOT_AUTHORIZED',
    'DESTRUCTIVE_EXECUTOR_NOT_AUTHORIZED',
  ]);
  assert.equal(result.destructiveActionAuthorized, false);
});

test('invalid evaluation time fails before any readiness probe runs', async () => {
  let calls = 0;
  const never = async () => {
    calls += 1;
    throw new Error('must not run');
  };

  const result = await inspectRetentionExecutionPlan('not-a-date', {
    inspectRefresh: never,
    inspectExactLocation: never,
    inspectDetailed: never,
    inspectModeration: never,
    inspectAi: never,
  });

  assert.deepEqual(result, {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error: 'invalid_evaluation_at',
  });
  assert.equal(calls, 0);
});

test('any unavailable readiness source fails the aggregate plan closed', async () => {
  const result = await inspectRetentionExecutionPlan(
    '2026-09-21T12:00:00Z',
    dependencies({
      async inspectModeration() {
        return {
          ok: false,
          mode: 'READ_ONLY_RETENTION_READINESS',
          destructiveActionAuthorized: false,
          claimsPurgeExecuted: false,
          claimsRuntimeFinalActionStampingImplemented: false,
          claimsHistoricalBackfillComplete: false,
          error: 'database_unavailable',
          retryable: true,
        };
      },
      async inspectAi() {
        return {
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
        };
      },
    }),
  );

  assert.deepEqual(result, {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    error: 'readiness_unavailable',
    failedProbes: ['moderation_evidence', 'ai_messages'],
  });
});
