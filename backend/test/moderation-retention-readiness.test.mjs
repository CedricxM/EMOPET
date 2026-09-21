import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  inspectModerationRetention,
} from '../dist/api/services/moderation-retention-readiness.js';

test('moderation readiness source is read-only and bound to the approved 12-month final-action clock', async () => {
  const [source, schedule] = await Promise.all([
    readFile(
      new URL('../api/services/moderation-retention-readiness.ts', import.meta.url),
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
    'UPDATE community_reports',
    'INSERT INTO community_reports',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsRuntimeFinalActionStampingImplemented: false/);
  assert.match(source, /claimsHistoricalBackfillComplete: false/);

  const row = schedule.categories.find((entry) => entry.id === 'moderation_evidence');
  assert.deepEqual(row.activeRetention, {
    mode: 'DURATION',
    value: 12,
    unit: 'MONTHS',
  });
  assert.equal(row.trigger, 'final moderation action');
  assert.equal(row.clockField, 'community_reports.final_action_at');
  assert.equal(
    row.clockBoundary,
    'RUNTIME_FINAL_ACTION_STAMPING_NOT_IMPLEMENTED_NO_HISTORICAL_BACKFILL',
  );
});

test('moderation readiness reports rows beyond 12 months without claiming purge or clock completeness', async () => {
  let observedEvaluation = null;

  const result = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt(evaluationAt) {
        observedEvaluation = evaluationAt;
        return {
          total: 9,
          clockedTotal: 6,
          unclockedTotal: 3,
          beyondWindowTotal: 2,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'READ_ONLY_RETENTION_READINESS');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsRuntimeFinalActionStampingImplemented, false);
  assert.equal(result.claimsHistoricalBackfillComplete, false);
  assert.equal(result.categoryId, 'moderation_evidence');
  assert.equal(result.policyMonths, 12);
  assert.equal(result.cutoffAt, '2025-09-21T12:00:00.000Z');
  assert.equal(observedEvaluation.toISOString(), '2026-09-21T12:00:00.000Z');
  assert.equal(result.expiryBasis, 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS');
  assert.equal(result.status, 'ROWS_BEYOND_12_MONTHS_PRESENT');
  assert.deepEqual(result.counts, {
    total: 9,
    clockedTotal: 6,
    unclockedTotal: 3,
    beyondWindowTotal: 2,
  });
});

test('moderation readiness surfaces missing final-action clocks even when no stamped row is expired', async () => {
  const result = await inspectModerationRetention(
    '2026-09-21T12:00:00Z',
    {
      async countExpiredAt() {
        return {
          total: 4,
          clockedTotal: 2,
          unclockedTotal: 2,
          beyondWindowTotal: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_ROWS_BEYOND_12_MONTHS_CLOCK_GAPS_PRESENT');
  assert.equal(result.evaluationAt, '2026-09-21T12:00:00.000Z');
  assert.equal(result.claimsRuntimeFinalActionStampingImplemented, false);
  assert.equal(result.claimsHistoricalBackfillComplete, false);
});

test('moderation readiness can report no current row beyond the window without claiming global retention compliance', async () => {
  const result = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt() {
        return {
          total: 3,
          clockedTotal: 3,
          unclockedTotal: 0,
          beyondWindowTotal: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_ROWS_BEYOND_12_MONTHS');
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsRuntimeFinalActionStampingImplemented, false);
  assert.equal(result.claimsHistoricalBackfillComplete, false);
  assert.equal(
    result.policyBoundary,
    'FINAL_ACTION_CLOCK_READINESS_ONLY_RUNTIME_STAMPING_AND_HISTORICAL_BACKFILL_NOT_VERIFIED',
  );
});

test('moderation readiness uses calendar-month subtraction with leap-day clamping', async () => {
  let observedEvaluation = null;

  const result = await inspectModerationRetention(
    '2024-02-29T12:00:00.000Z',
    {
      async countExpiredAt(evaluationAt) {
        observedEvaluation = evaluationAt;
        return {
          total: 0,
          clockedTotal: 0,
          unclockedTotal: 0,
          beyondWindowTotal: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(observedEvaluation.toISOString(), '2024-02-29T12:00:00.000Z');
  assert.equal(result.cutoffAt, '2023-02-28T12:00:00.000Z');
});

test('moderation readiness fails closed on invalid time, inconsistent aggregates and repository outage', async () => {
  let calls = 0;
  const invalidTime = await inspectModerationRetention(
    '2026-09-21T12:00:00+02:00',
    {
      async countExpiredAt() {
        calls += 1;
        throw new Error('must not run');
      },
    },
  );
  assert.deepEqual(invalidTime, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsRuntimeFinalActionStampingImplemented: false,
    claimsHistoricalBackfillComplete: false,
    error: 'invalid_evaluation_at',
  });
  assert.equal(calls, 0);

  const inconsistent = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt() {
        return {
          total: 3,
          clockedTotal: 3,
          unclockedTotal: 1,
          beyondWindowTotal: 0,
        };
      },
    },
  );
  assert.deepEqual(inconsistent, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsRuntimeFinalActionStampingImplemented: false,
    claimsHistoricalBackfillComplete: false,
    error: 'invalid_repository_result',
  });

  const impossibleExpired = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt() {
        return {
          total: 2,
          clockedTotal: 1,
          unclockedTotal: 1,
          beyondWindowTotal: 2,
        };
      },
    },
  );
  assert.equal(impossibleExpired.ok, false);
  assert.equal(impossibleExpired.error, 'invalid_repository_result');

  const unavailable = await inspectModerationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt() {
        throw new Error('database offline');
      },
    },
  );
  assert.deepEqual(unavailable, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsRuntimeFinalActionStampingImplemented: false,
    claimsHistoricalBackfillComplete: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
