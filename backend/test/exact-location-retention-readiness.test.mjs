import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { inspectExactLocationRetention } from '../dist/api/services/exact-location-retention-readiness.js';

test('exact-location readiness source is read-only, aggregate-only and bounded to the 24-hour maximum', async () => {
  const [source, schedule] = await Promise.all([
    readFile(
      new URL('../api/services/exact-location-retention-readiness.ts', import.meta.url),
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
    'UPDATE copresence_events',
    'INSERT INTO copresence_events',
    'dogAId:',
    'dogBId:',
    'latitude:',
    'longitude:',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.match(source, /REPEATABLE READ, READ ONLY/);
  assert.match(source, /destructiveActionAuthorized: false/);
  assert.match(source, /claimsPurgeExecuted: false/);
  assert.match(source, /claimsSessionEndCompliance: false/);

  const exact = schedule.categories.find((row) => row.id === 'exact_location');
  assert.deepEqual(exact.activeRetention, {
    mode: 'MAX_DURATION',
    value: 24,
    unit: 'HOURS',
  });
  assert.equal(
    exact.finalDisposition,
    'DELETE_AT_EXPIRY_OR_FEATURE_SESSION_END_WHICHEVER_IS_EARLIER',
  );
  assert.equal(exact.readinessStatus, 'IMPLEMENTED_READ_ONLY_MAX_WINDOW');
  assert.equal(
    exact.readinessBoundary,
    'MAX_24_HOURS_ONLY_SESSION_END_MAY_REQUIRE_EARLIER_DELETION',
  );
  assert.deepEqual(exact.readinessEvidence, [
    'backend/api/services/exact-location-retention-readiness.ts',
    'backend/test/exact-location-retention-readiness.test.mjs',
    'backend/test/exact-location-retention-readiness.integration.test.mjs',
  ]);
});

test('readiness reports only aggregate rows definitely beyond the 24-hour maximum', async () => {
  let observedCutoff = null;
  const result = await inspectExactLocationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countAt(cutoff) {
        observedCutoff = cutoff;
        return {
          coordinateBearingTotal: 9,
          completeCoordinatePairs: 7,
          partialCoordinateRows: 2,
          beyondMaxWindowTotal: 4,
          beyondMaxWindowCompletePairs: 3,
          beyondMaxWindowPartialRows: 1,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'READ_ONLY_RETENTION_READINESS');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.claimsPurgeExecuted, false);
  assert.equal(result.claimsSessionEndCompliance, false);
  assert.equal(result.categoryId, 'exact_location');
  assert.equal(result.policyMaxHours, 24);
  assert.equal(result.status, 'ROWS_BEYOND_MAX_WINDOW_PRESENT');
  assert.equal(
    result.policyBoundary,
    'MAX_24_HOURS_ONLY_SESSION_END_MAY_REQUIRE_EARLIER_DELETION',
  );
  assert.equal(result.cutoffAt, '2026-09-20T12:00:00.000Z');
  assert.equal(observedCutoff.toISOString(), '2026-09-20T12:00:00.000Z');
  assert.deepEqual(result.counts, {
    coordinateBearingTotal: 9,
    completeCoordinatePairs: 7,
    partialCoordinateRows: 2,
    beyondMaxWindowTotal: 4,
    beyondMaxWindowCompletePairs: 3,
    beyondMaxWindowPartialRows: 1,
  });
});

test('readiness distinguishes no rows beyond the maximum without claiming session-end compliance', async () => {
  const result = await inspectExactLocationRetention(
    '2026-09-21T12:00:00Z',
    {
      async countAt() {
        return {
          coordinateBearingTotal: 2,
          completeCoordinatePairs: 2,
          partialCoordinateRows: 0,
          beyondMaxWindowTotal: 0,
          beyondMaxWindowCompletePairs: 0,
          beyondMaxWindowPartialRows: 0,
        };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, 'NO_ROWS_BEYOND_MAX_WINDOW');
  assert.equal(result.claimsSessionEndCompliance, false);
  assert.equal(result.evaluationAt, '2026-09-21T12:00:00.000Z');
});

test('readiness fails closed on invalid time, inconsistent aggregates and repository failure', async () => {
  let calls = 0;
  const invalidTime = await inspectExactLocationRetention(
    '2026-09-21T12:00:00+02:00',
    {
      async countAt() {
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
    claimsSessionEndCompliance: false,
    error: 'invalid_evaluation_at',
  });
  assert.equal(calls, 0);

  const inconsistent = await inspectExactLocationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countAt() {
        return {
          coordinateBearingTotal: 2,
          completeCoordinatePairs: 2,
          partialCoordinateRows: 1,
          beyondMaxWindowTotal: 1,
          beyondMaxWindowCompletePairs: 1,
          beyondMaxWindowPartialRows: 0,
        };
      },
    },
  );
  assert.deepEqual(inconsistent, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsSessionEndCompliance: false,
    error: 'invalid_repository_result',
  });

  const unavailable = await inspectExactLocationRetention(
    '2026-09-21T12:00:00.000Z',
    {
      async countAt() {
        throw new Error('database offline');
      },
    },
  );
  assert.deepEqual(unavailable, {
    ok: false,
    mode: 'READ_ONLY_RETENTION_READINESS',
    destructiveActionAuthorized: false,
    claimsPurgeExecuted: false,
    claimsSessionEndCompliance: false,
    error: 'database_unavailable',
    retryable: true,
  });
});
