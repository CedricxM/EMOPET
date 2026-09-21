import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const enabled = process.env.RETENTION_EXECUTION_PLAN_DB_INTEGRATION === '1';

let inspectRetentionExecutionPlan = null;
let closeDatabase = null;

if (enabled) {
  const [planModule, dbModule] = await Promise.all([
    import('../dist/api/services/retention-execution-plan.js'),
    import('../dist/db/index.js'),
  ]);
  inspectRetentionExecutionPlan = planModule.inspectRetentionExecutionPlan;
  closeDatabase = dbModule.closeDatabase;
}

after(async () => {
  if (closeDatabase) await closeDatabase();
});

test('global retention execution plan composes current generated-baseline readiness without mutation', {
  skip: !enabled,
}, async () => {
  const result = await inspectRetentionExecutionPlan('2026-09-21T12:00:00Z');

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.mode, 'DRY_RUN_ONLY');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsCrossCategorySnapshotAtomic, false);
  assert.equal(result.status, 'NO_RETENTION_SIGNALS');
  assert.equal(result.observedSignalCountTotal, 0);
  assert.deepEqual(result.signals, []);
  assert.deepEqual(result.probeBoundaries, {
    exactLocationSessionEndComplete: false,
    detailedAggregationComplete: false,
    moderationRuntimeFinalActionStampingComplete: false,
    moderationHistoricalBackfillComplete: false,
  });
  assert.equal(
    result.policyBoundary,
    'AGGREGATED_READ_ONLY_SIGNALS_NO_ROW_IDS_NO_MUTATION_NO_EXECUTION_AUTHORITY',
  );
});
