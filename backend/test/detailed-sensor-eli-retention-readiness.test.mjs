import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { inspectDetailedSensorEliRetention } from '../dist/api/services/detailed-sensor-eli-retention-readiness.js';

test('detailed sensor + ELI readiness is read-only and pinned to founder R3', async () => {
  const [source, schedule] = await Promise.all([
    readFile(
      new URL('../api/services/detailed-sensor-eli-retention-readiness.ts', import.meta.url),
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
    'UPDATE sensor_summaries',
    'UPDATE eli_states',
    'INSERT INTO sensor_summaries',
    'INSERT INTO eli_states',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsAggregationCompleted: false/);

  assert.equal(
    schedule.decisions.R3,
    'DETAILED_SENSOR_AND_ELI_SOURCE_ALIGNED_36_MONTHS',
  );

  for (const id of ['sensor_preprocessed_detailed', 'eli_inferred_detailed']) {
    const row = schedule.categories.find((entry) => entry.id === id);
    assert.deepEqual(row.activeRetention, {
      mode: 'DURATION',
      value: 36,
      unit: 'MONTHS',
    });
    assert.equal(row.authority, 'PRODUCT_APPROVED_SOURCE_ALIGNED_36_MONTHS');
    assert.equal(row.readinessStatus, 'IMPLEMENTED_READ_ONLY_36_MONTH_WINDOW');
    assert.equal(
      row.readinessBoundary,
      'DETAILED_ONLY_AGGREGATION_AND_PURGE_EXECUTION_NOT_VERIFIED',
    );
  }
});

test('readiness reports sensor and ELI detailed overages separately', async () => {
  let observedEvaluation = null;
  const result = await inspectDetailedSensorEliRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt(evaluationAt) {
        observedEvaluation = evaluationAt;
        return {
          sensorDetailedTotal: 11,
          sensorBeyondWindow: 3,
          eliDetailedTotal: 8,
          eliBeyondWindow: 2,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'READ_ONLY_RETENTION_READINESS');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsAggregationCompleted, false);
  assert.deepEqual(result.categoryIds, [
    'sensor_preprocessed_detailed',
    'eli_inferred_detailed',
  ]);
  assert.equal(result.policyMonths, 36);
  assert.equal(result.cutoffAt, '2023-09-21T12:00:00.000Z');
  assert.equal(observedEvaluation.toISOString(), '2026-09-21T12:00:00.000Z');
  assert.equal(result.expiryBasis, 'ROW_CLOCK_PLUS_UTC_CALENDAR_MONTHS');
  assert.equal(result.status, 'DETAILED_ROWS_BEYOND_36_MONTHS_PRESENT');
  assert.deepEqual(result.counts, {
    sensorDetailedTotal: 11,
    sensorBeyondWindow: 3,
    eliDetailedTotal: 8,
    eliBeyondWindow: 2,
  });
});

test('36-month cutoff preserves UTC calendar-month semantics at leap-day boundaries', async () => {
  let observedEvaluation = null;
  const result = await inspectDetailedSensorEliRetention(
    '2024-02-29T12:34:56.000Z',
    {
      async countExpiredAt(evaluationAt) {
        observedEvaluation = evaluationAt;
        return {
          sensorDetailedTotal: 0,
          sensorBeyondWindow: 0,
          eliDetailedTotal: 0,
          eliBeyondWindow: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_DETAILED_ROWS_BEYOND_36_MONTHS');
  assert.equal(observedEvaluation.toISOString(), '2024-02-29T12:34:56.000Z');
  assert.equal(result.cutoffAt, '2021-02-28T12:34:56.000Z');
});

test('readiness fails closed on invalid time, inconsistent counts and repository failure', async () => {
  let calls = 0;
  const invalidTime = await inspectDetailedSensorEliRetention(
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
    claimsAggregationCompleted: false,
    error: 'invalid_evaluation_at',
  });
  assert.equal(calls, 0);

  const inconsistent = await inspectDetailedSensorEliRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countExpiredAt() {
        return {
          sensorDetailedTotal: 1,
          sensorBeyondWindow: 2,
          eliDetailedTotal: 1,
          eliBeyondWindow: 0,
        };
      },
    },
  );
  assert.equal(inconsistent.ok, false);
  assert.equal(inconsistent.error, 'invalid_repository_result');

  const unavailable = await inspectDetailedSensorEliRetention(
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
    claimsAggregationCompleted: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
