import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  computeRetentionExpiry,
  planRetentionDryRun,
} from '../dist/api/services/retention-dry-run.js';
import { inspectExpiredRefreshSessionRetention } from '../dist/api/services/auth-session-retention-readiness.js';
import { inspectExactLocationRetention } from '../dist/api/services/exact-location-retention-readiness.js';
import { inspectDetailedSensorEliRetention } from '../dist/api/services/detailed-sensor-eli-retention-readiness.js';
import { inspectModerationRetention } from '../dist/api/services/moderation-retention-readiness.js';

const schedule = JSON.parse(await readFile(
  new URL('../../config/privacy/retention-schedule.json', import.meta.url), 'utf8',
));
const probes = [
  {
    name: 'refresh sessions', inspect: inspectExpiredRefreshSessionRetention,
    method: 'countExpiredAt',
    counts: { expiredTotal: 0, detachedExpired: 0, linkedExpired: 0, revokedExpired: 0, unrevokedExpired: 0 },
  },
  {
    name: 'exact location', inspect: inspectExactLocationRetention, method: 'countAt',
    counts: {
      coordinateBearingTotal: 0, completeCoordinatePairs: 0, partialCoordinateRows: 0,
      beyondMaxWindowTotal: 0, beyondMaxWindowCompletePairs: 0, beyondMaxWindowPartialRows: 0,
    },
  },
  {
    name: 'sensor and ELI detail', inspect: inspectDetailedSensorEliRetention, method: 'countAt',
    counts: { sensorDetailedTotal: 0, sensorBeyondWindow: 0, eliDetailedTotal: 0, eliBeyondWindow: 0 },
  },
  {
    name: 'moderation', inspect: inspectModerationRetention, method: 'countAt',
    counts: { total: 0, clockedTotal: 0, unclockedTotal: 0, beyondWindowTotal: 0 },
  },
];
const invalidInstants = [
  '2026-02-30T12:00:00.000Z',
  '2026-02-29T12:00:00.000Z',
  '2026-04-31T12:00:00.000Z',
  '1900-02-29T12:00:00.000Z',
  '2026-09-21T24:00:00.000Z',
  '2026-09-21Z',
  '2026-09-21 12:00:00Z',
  '2026-09-21T12:00:00.0001Z',
  '2026-09-21T12:00:00+00:00',
  '2026-09-21T12:00:00.000Z\n',
  '+010000-01-01T00:00:00.000Z',
  '-000001-01-01T00:00:00.000Z',
  'not-a-date',
  null, undefined, 0, {},
];

for (const probe of probes) {
  test(`${probe.name}: impossible or lossy UTC instants fail before repository access`, async () => {
    let calls = 0;
    for (const input of invalidInstants) {
      const result = await probe.inspect(input, {
        async [probe.method]() { calls += 1; return probe.counts; },
      });
      assert.equal(result.ok, false, String(input));
      assert.equal(result.error, 'invalid_evaluation_at', String(input));
      assert.equal(result.destructiveActionAuthorized, false);
      assert.equal(result.claimsPurgeExecuted, false);
    }
    assert.equal(calls, 0);
  });

  test(`${probe.name}: explicit UTC seconds and millisecond precision stay supported`, async () => {
    for (const [suffix, canonicalSuffix] of [
      ['Z', '.000Z'], ['.1Z', '.100Z'], ['.12Z', '.120Z'], ['.123Z', '.123Z'],
    ]) {
      let calls = 0;
      const result = await probe.inspect(`2024-02-29T12:00:00${suffix}`, {
        async [probe.method](at) {
          calls += 1;
          assert.equal(Number.isFinite(at.getTime()), true);
          return probe.counts;
        },
      });
      assert.equal(result.ok, true);
      assert.equal(result.evaluationAt, `2024-02-29T12:00:00${canonicalSuffix}`);
      assert.equal(result.destructiveActionAuthorized, false);
      assert.equal(calls, 1);
    }
  });
}

test('dry-run rejects impossible dates in every clock input', () => {
  const input = {
    categoryId: 'exact_location',
    evaluationAt: '2026-09-21T12:00:00.000Z',
    retentionStartedAt: '2026-09-20T12:00:00.000Z',
  };
  for (const [field, error] of [
    ['evaluationAt', 'invalid_evaluation_at'],
    ['retentionStartedAt', 'invalid_retention_started_at'],
    ['lifecycleEndedAt', 'invalid_lifecycle_ended_at'],
    ['earlyExpiryAt', 'invalid_early_expiry_at'],
  ]) {
    for (const invalid of invalidInstants.filter((value) => typeof value === 'string')) {
      const result = planRetentionDryRun(schedule, { ...input, [field]: invalid });
      assert.equal(result.ok, false, `${field}: ${invalid}`);
      assert.equal(result.error, error, `${field}: ${invalid}`);
      assert.equal(result.destructiveActionAuthorized, false);
    }
  }
});

test('expiry arithmetic rejects invalid input and overflow without throwing', () => {
  for (const invalid of invalidInstants) {
    assert.equal(computeRetentionExpiry(invalid, 1, 'MONTHS'), null, String(invalid));
  }
  for (const unit of ['SECONDS', 'HOURS', 'DAYS', 'MONTHS', 'YEARS']) {
    assert.equal(computeRetentionExpiry('2026-01-01T00:00:00.000Z', Number.MAX_SAFE_INTEGER, unit), null, unit);
    assert.equal(computeRetentionExpiry('9999-12-31T23:59:59.999Z', 1, unit), null, unit);
    assert.equal(computeRetentionExpiry('9999-12-31T23:59:59.999Z', 0, unit), '9999-12-31T23:59:59.999Z', unit);
  }
});

test('calendar expiry preserves years below 0100 and Gregorian leap days', () => {
  for (const [start, value, unit, expected] of [
    ['0000-01-31T12:34:56.789Z', 1, 'MONTHS', '0000-02-29T12:34:56.789Z'],
    ['0099-01-31T12:34:56.789Z', 1, 'MONTHS', '0099-02-28T12:34:56.789Z'],
    ['0099-12-31T12:34:56.789Z', 1, 'MONTHS', '0100-01-31T12:34:56.789Z'],
    ['2000-02-29T12:34:56.789Z', 1, 'YEARS', '2001-02-28T12:34:56.789Z'],
  ]) {
    assert.equal(computeRetentionExpiry(start, value, unit), expected);
  }
});

test('an unrepresentable cutoff is an input failure and never reaches the database', async () => {
  for (const probe of probes.filter((entry) => entry.method === 'countAt')) {
    let calls = 0;
    const result = await probe.inspect('0000-01-01T00:00:00.000Z', {
      async countAt() { calls += 1; return probe.counts; },
    });
    assert.equal(result.ok, false, probe.name);
    assert.equal(result.error, 'invalid_evaluation_at', probe.name);
    assert.equal(result.retryable, undefined, probe.name);
    assert.equal(calls, 0, probe.name);
  }
});

test('readiness calendar cutoffs preserve year 0000 leap-day semantics', async () => {
  for (const [inspect, input] of [
    [inspectModerationRetention, '0001-02-28T12:00:00.000Z'],
    [inspectDetailedSensorEliRetention, '0003-02-28T12:00:00.000Z'],
  ]) {
    const probe = probes.find((entry) => entry.inspect === inspect);
    const result = await inspect(input, { async countAt() { return probe.counts; } });
    assert.equal(result.ok, true);
    assert.equal(result.cutoffAt, '0000-02-28T12:00:00.000Z');
  }
});

test('unrepresentable expiry produces the existing bounded dry-run failure', () => {
  const result = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_detailed',
    retentionStartedAt: '9999-12-31T00:00:00.000Z',
    evaluationAt: '9999-12-31T00:00:00.000Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'duration_rule_invalid');
  assert.equal(result.destructiveActionAuthorized, false);
});
