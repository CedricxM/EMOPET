import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  authoritySource,
  runtimeSource,
  workerSource,
  schedulerSource,
  schedulerWorkerSource,
  schedulerMigrationSource,
] = await Promise.all([
  readFile(new URL('../../config/security/security-detection-runtime-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-runtime.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/security-detection-scan.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-scheduler.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/security-detection-scheduler-tick.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/migrations/0037_security_detection_scheduler_state.sql', import.meta.url), 'utf8'),
]);

const authority = JSON.parse(authoritySource);

test('#525 runtime has canonical DB source without claiming continuous production monitoring', () => {
  assert.equal(authority.issue, 525);
  assert.equal(authority.eventSource, 'security_audit_events');
  assert.equal(authority.httpRoute, null);
  assert.equal(authority.policy.productionValuesSelected, false);
  assert.equal(authority.policy.defaultsInRuntime, false);
  assert.equal(authority.policy.requiredPerRun, true);

  assert.equal(authority.scheduler.issue, 769);
  assert.equal(authority.scheduler.stateTable, 'security_detection_scheduler_state');
  assert.equal(authority.scheduler.streamId, 'security-audit-v1');
  assert.equal(authority.scheduler.serialization, 'POSTGRES_TRANSACTION_ADVISORY_LOCK');
  assert.equal(authority.scheduler.cursorAdvance, 'EVALUATED_ONLY');
  assert.equal(authority.scheduler.databaseClockWindowEnd, true);
  assert.equal(authority.scheduler.httpRoute, null);

  assert.match(authority.operationalGaps.continuousScheduler, /DEPLOYMENT_CADENCE_OPEN/);
  assert.equal(authority.operationalGaps.durableDetectionHistory, 'NOT_IMPLEMENTED');
  assert.equal(authority.operationalGaps.productionPolicyApproval, 'OPEN');
  assert.equal(authority.operationalGaps.alertDelivery, 'OPEN_UNDER_526');
});

test('one-shot runtime still requires explicit window, policy revision, policy and event bound', () => {
  for (const token of [
    "'policyRevision'",
    "'windowStart'",
    "'windowEnd'",
    "'maxEvents'",
    "'policy'",
  ]) {
    assert.ok(runtimeSource.includes(token), token);
  }

  assert.match(runtimeSource, /SECURITY_DETECTION_SCAN_HARD_CAP = 10_000/);
  assert.doesNotMatch(runtimeSource, /Date\.now\(\)/);
  assert.doesNotMatch(runtimeSource, /new Date\(\)\.toISOString\(\)/);
});

test('one-shot worker emits only redacted summary and creates no HTTP surface', () => {
  assert.match(workerSource, /summarizeSecurityDetectionRuntimeResult/);
  assert.doesNotMatch(workerSource, /result\.detections/);
  assert.doesNotMatch(workerSource, /actorKey/);
  assert.doesNotMatch(workerSource, /targetRef/);

  assert.doesNotMatch(runtimeSource, /app\.(get|post|put|patch|delete)\(/);
  assert.doesNotMatch(workerSource, /app\.(get|post|put|patch|delete)\(/);
});

test('#769 scheduler serializes ticks and advances only a minimal durable cursor', () => {
  assert.match(schedulerSource, /pg_try_advisory_xact_lock/);
  assert.match(schedulerSource, /SECURITY_DETECTION_STREAM_ID = 'security-audit-v1'/);
  assert.match(schedulerSource, /CURRENT_TIMESTAMP AS now/);
  assert.match(schedulerSource, /status: 'BUSY'/);
  assert.match(schedulerSource, /status: 'INITIAL_CURSOR_REQUIRED'/);
  assert.match(schedulerSource, /scan\.status !== 'EVALUATED'/);
  assert.match(schedulerSource, /lastSuccessfulWindowEnd: databaseNow/);

  assert.match(schedulerMigrationSource, /CREATE TABLE security_detection_scheduler_state/);
  assert.match(schedulerMigrationSource, /stream_id varchar\(64\) PRIMARY KEY/);
  assert.match(schedulerMigrationSource, /last_successful_window_end timestamptz NOT NULL/);
  assert.doesNotMatch(
    schedulerMigrationSource,
    /actor_id|actor_subject|target_ref|email|token_hash|detection_payload|policy_json/i,
  );

  assert.doesNotMatch(schedulerSource, /app\.(get|post|put|patch|delete)\(/);
  assert.doesNotMatch(schedulerWorkerSource, /app\.(get|post|put|patch|delete)\(/);
});

test('#769 worker has no hidden schedule or production detector defaults', () => {
  assert.match(schedulerWorkerSource, /SECURITY_DETECTION_POLICY_JSON/);
  assert.match(schedulerWorkerSource, /SECURITY_DETECTION_POLICY_REVISION/);
  assert.match(schedulerWorkerSource, /SECURITY_DETECTION_MAX_EVENTS/);
  assert.match(schedulerWorkerSource, /SECURITY_DETECTION_INITIAL_WINDOW_START/);

  assert.doesNotMatch(schedulerWorkerSource, /setInterval|setTimeout|cron/i);
  assert.doesNotMatch(schedulerWorkerSource, /threshold:\s*\d+/);
  assert.doesNotMatch(schedulerWorkerSource, /windowSeconds:\s*\d+/);
});
