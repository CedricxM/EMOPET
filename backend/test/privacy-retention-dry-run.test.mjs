import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  computeRetentionExpiry,
  planRetentionDryRun,
} from '../dist/api/services/retention-dry-run.js';

const schedule = JSON.parse(
  await readFile(new URL('../../config/privacy/retention-schedule.json', import.meta.url), 'utf8'),
);

test('planner source remains pure and contains no persistence/mutation capability', async () => {
  const source = await readFile(
    new URL('../api/services/retention-dry-run.ts', import.meta.url),
    'utf8',
  );

  for (const forbidden of [
    "from '../../db",
    "from '../db",
    'drizzle-orm',
    'postgres',
    '.delete(',
    '.update(',
    '.insert(',
    'DELETE FROM',
    'UPDATE ',
    'INSERT INTO',
    'fetch(',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }

  assert.equal(source.includes("mode: 'DRY_RUN_ONLY'"), true);
  assert.equal(source.includes('destructiveActionAuthorized: false'), true);
});

test('planner is explicitly dry-run only and never authorises destructive action', () => {
  const before = JSON.stringify(schedule);
  const result = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_detailed',
    retentionStartedAt: '2024-09-21T07:00:00.000Z',
    evaluationAt: '2026-09-20T07:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'DRY_RUN_ONLY');
  assert.equal(result.destructiveActionAuthorized, false);
  assert.equal(result.verdict, 'KEEP');
  assert.equal(result.reason, 'WITHIN_RETENTION_WINDOW');
  assert.equal(result.ordinaryExpiryAt, '2026-09-21T07:00:00.000Z');
  assert.equal(JSON.stringify(schedule), before, 'planner must not mutate policy input');
});

test('24-month MAT/TAG detail expires exactly at the candidate calendar boundary', () => {
  const before = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_detailed',
    retentionStartedAt: '2024-09-21T07:00:00.000Z',
    evaluationAt: '2026-09-21T06:59:59.999Z',
  });
  const atBoundary = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_detailed',
    retentionStartedAt: '2024-09-21T07:00:00.000Z',
    evaluationAt: '2026-09-21T07:00:00.000Z',
  });

  assert.equal(before.ok, true);
  assert.equal(before.verdict, 'KEEP');
  assert.equal(atBoundary.ok, true);
  assert.equal(atBoundary.verdict, 'EXPIRED');
  assert.equal(atBoundary.reason, 'RETENTION_WINDOW_ELAPSED');
});

test('36-month ELI detail uses calendar duration rather than a fixed day approximation', () => {
  const result = planRetentionDryRun(schedule, {
    categoryId: 'eli_inferred_detailed',
    retentionStartedAt: '2023-09-21T12:34:56.000Z',
    evaluationAt: '2026-09-21T12:34:56.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.verdict, 'EXPIRED');
  assert.equal(result.ordinaryExpiryAt, '2026-09-21T12:34:56.000Z');
});

test('calendar month arithmetic clamps month-end safely', () => {
  assert.equal(
    computeRetentionExpiry('2024-01-31T12:00:00.000Z', 1, 'MONTHS'),
    '2024-02-29T12:00:00.000Z',
  );
  assert.equal(
    computeRetentionExpiry('2025-01-31T12:00:00.000Z', 1, 'MONTHS'),
    '2025-02-28T12:00:00.000Z',
  );
  assert.equal(
    computeRetentionExpiry('2024-02-29T12:00:00.000Z', 1, 'YEARS'),
    '2025-02-28T12:00:00.000Z',
  );
});

test('R1-B aggregates stay while the dog profile is active and expire on lifecycle end', () => {
  const active = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_aggregates',
    evaluationAt: '2032-01-01T00:00:00.000Z',
  });
  const ended = planRetentionDryRun(schedule, {
    categoryId: 'sensor_preprocessed_aggregates',
    lifecycleEndedAt: '2032-01-01T00:00:00.000Z',
    evaluationAt: '2032-01-01T00:00:00.000Z',
  });

  assert.equal(active.ok, true);
  assert.equal(active.verdict, 'KEEP');
  assert.equal(active.reason, 'ACTIVE_LIFECYCLE');
  assert.equal(ended.ok, true);
  assert.equal(ended.verdict, 'EXPIRED');
  assert.equal(ended.reason, 'LIFECYCLE_ENDED');
});

test('exact location expires at the earlier of 24h or explicit feature/session end', () => {
  const timed = planRetentionDryRun(schedule, {
    categoryId: 'exact_location',
    retentionStartedAt: '2026-09-21T08:00:00.000Z',
    evaluationAt: '2026-09-21T09:00:00.000Z',
  });
  const sessionEnded = planRetentionDryRun(schedule, {
    categoryId: 'exact_location',
    retentionStartedAt: '2026-09-21T08:00:00.000Z',
    earlyExpiryAt: '2026-09-21T08:30:00.000Z',
    evaluationAt: '2026-09-21T08:30:00.000Z',
  });

  assert.equal(timed.ok, true);
  assert.equal(timed.verdict, 'KEEP');
  assert.equal(timed.ordinaryExpiryAt, '2026-09-22T08:00:00.000Z');
  assert.equal(sessionEnded.ok, true);
  assert.equal(sessionEnded.verdict, 'EXPIRED');
  assert.equal(sessionEnded.reason, 'EARLY_EXPIRY_REACHED');
  assert.equal(sessionEnded.effectiveExpiryAt, '2026-09-21T08:30:00.000Z');
});

test('approved hold suspends an otherwise due retention disposition', () => {
  const result = planRetentionDryRun(schedule, {
    categoryId: 'incident_evidence',
    retentionStartedAt: '2024-09-21T00:00:00.000Z',
    evaluationAt: '2026-09-21T00:00:00.000Z',
    hold: {
      active: true,
      condition: 'DOCUMENTED_INVESTIGATION_OR_LEGAL_HOLD',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.verdict, 'HELD');
  assert.equal(result.reason, 'ACTIVE_APPROVED_HOLD');
  assert.equal(result.holdCondition, 'DOCUMENTED_INVESTIGATION_OR_LEGAL_HOLD');
});

test('planner rejects invented or forbidden holds', () => {
  const forbidden = planRetentionDryRun(schedule, {
    categoryId: 'exact_location',
    retentionStartedAt: '2026-09-20T00:00:00.000Z',
    evaluationAt: '2026-09-22T00:00:00.000Z',
    hold: {
      active: true,
      condition: 'DOCUMENTED_LEGAL_OR_RIGHTS_HOLD',
    },
  });
  const mismatched = planRetentionDryRun(schedule, {
    categoryId: 'incident_evidence',
    retentionStartedAt: '2024-09-21T00:00:00.000Z',
    evaluationAt: '2026-09-21T00:00:00.000Z',
    hold: {
      active: true,
      condition: 'MADE_UP_HOLD',
    },
  });

  assert.deepEqual(forbidden, {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    error: 'hold_not_allowed',
  });
  assert.deepEqual(mismatched, {
    ok: false,
    mode: 'DRY_RUN_ONLY',
    destructiveActionAuthorized: false,
    error: 'hold_condition_mismatch',
  });
});

test('zero-durable-retention raw audio is immediately expired when a durable record exists', () => {
  const present = planRetentionDryRun(schedule, {
    categoryId: 'sensor_raw_audio',
    retentionStartedAt: '2026-09-21T07:00:00.000Z',
    evaluationAt: '2026-09-21T07:00:00.000Z',
    durableRecordPresent: true,
  });
  const absent = planRetentionDryRun(schedule, {
    categoryId: 'sensor_raw_audio',
    evaluationAt: '2026-09-21T07:00:00.000Z',
    durableRecordPresent: false,
  });

  assert.equal(present.ok, true);
  assert.equal(present.verdict, 'EXPIRED');
  assert.equal(present.reason, 'NO_DURABLE_RETENTION_RECORD_PRESENT');
  assert.equal(present.destructiveActionAuthorized, false);
  assert.equal(absent.ok, true);
  assert.equal(absent.verdict, 'NOT_APPLICABLE');
  assert.equal(absent.reason, 'NO_DURABLE_RECORD_PRESENT');
});

test('refresh-session records expire with the current 30-day credential window', () => {
  const before = planRetentionDryRun(schedule, {
    categoryId: 'auth_refresh_sessions',
    retentionStartedAt: '2026-09-01T07:00:00.000Z',
    evaluationAt: '2026-10-01T06:59:59.999Z',
  });
  const expired = planRetentionDryRun(schedule, {
    categoryId: 'auth_refresh_sessions',
    retentionStartedAt: '2026-09-01T07:00:00.000Z',
    evaluationAt: '2026-10-01T07:00:00.000Z',
  });

  assert.equal(before.ok, true);
  assert.equal(before.verdict, 'KEEP');
  assert.equal(expired.ok, true);
  assert.equal(expired.verdict, 'EXPIRED');
  assert.equal(expired.ordinaryExpiryAt, '2026-10-01T07:00:00.000Z');
  assert.equal(expired.destructiveActionAuthorized, false);
});

test('backups follow the explicit 30-day rolling candidate window', () => {
  const result = planRetentionDryRun(schedule, {
    categoryId: 'backups',
    retentionStartedAt: '2026-08-22T07:00:00.000Z',
    evaluationAt: '2026-09-21T07:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.verdict, 'EXPIRED');
  assert.equal(result.ordinaryExpiryAt, '2026-09-21T07:00:00.000Z');
});

test('planner fails closed on category, time, trigger and schedule authority errors', () => {
  assert.equal(planRetentionDryRun(schedule, {
    categoryId: 'not-real',
    evaluationAt: '2026-09-21T07:00:00.000Z',
  }).error, 'category_not_found');

  assert.equal(planRetentionDryRun(schedule, {
    categoryId: 'backups',
    evaluationAt: 'not-a-time',
  }).error, 'invalid_evaluation_at');

  assert.equal(planRetentionDryRun(schedule, {
    categoryId: 'backups',
    evaluationAt: '2026-09-21T07:00:00.000Z',
  }).error, 'retention_started_at_required');

  const promoted = structuredClone(schedule);
  promoted.runtimeEnforcement = 'IMPLEMENTED';
  assert.equal(planRetentionDryRun(promoted, {
    categoryId: 'backups',
    retentionStartedAt: '2026-08-22T07:00:00.000Z',
    evaluationAt: '2026-09-21T07:00:00.000Z',
  }).error, 'invalid_schedule');
});
