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
  lateReplayMigrationSource,
  detectorSource,
  detectionHistoryMigrationSource,
  detectionHistorySource,
] = await Promise.all([
  readFile(new URL('../../config/security/security-detection-runtime-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-runtime.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/security-detection-scan.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-scheduler.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/security-detection-scheduler-tick.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/migrations/0037_security_detection_scheduler_state.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/migrations/0038_security_detection_evaluated_events.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-anomaly-detection.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/migrations/0041_security_detection_history.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-history.ts', import.meta.url), 'utf8'),
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
  assert.match(authority.scheduler.lateArrivalBoundary, /UNRECEIPTED_CANONICAL_EVENT_DISCOVERY/);
  assert.match(authority.scheduler.lateArrivalBoundary, /POLICY_DERIVED_CONTEXT/);

  assert.match(authority.operationalGaps.continuousScheduler, /DEPLOYMENT_CADENCE_OPEN/);
  assert.match(authority.operationalGaps.lateAuditEventArrival, /REPOSITORY_RECEIPT_REPLAY_IMPLEMENTED/);
  assert.match(authority.operationalGaps.lateAuditEventArrival, /ALERT_DEDUPE_OPEN/);

  assert.equal(authority.lateEventReplay.issue, 776);
  assert.equal(authority.lateEventReplay.receiptTable, 'security_detection_evaluated_events');
  assert.match(authority.lateEventReplay.context, /EXPLICIT_POLICY_WINDOW/);
  assert.match(authority.lateEventReplay.markRule, /AFTER_SUCCESSFUL_NORMAL\+LATE_EVALUATION/);
  assert.equal(authority.lateEventReplay.alertDeliveryAuthority, false);
  assert.equal(authority.lateEventReplay.detectionHistoryAuthority, true);
  assert.equal(authority.lateEventReplay.httpRoute, null);
  assert.match(
    authority.operationalGaps.durableDetectionHistory,
    /BOUNDED_DURABLE_HISTORY_CANDIDATE/,
  );
  assert.match(
    authority.operationalGaps.durableDetectionHistory,
    /RETENTION_POLICY_OPEN/,
  );
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

test('#776 late-event replay uses receipts and policy-derived context without creating alert authority', () => {
  assert.match(lateReplayMigrationSource, /ADD COLUMN monitoring_started_at timestamptz/);
  assert.match(lateReplayMigrationSource, /CREATE TABLE security_detection_evaluated_events/);
  assert.match(lateReplayMigrationSource, /audit_event_id uuid PRIMARY KEY/);
  assert.match(lateReplayMigrationSource, /REFERENCES security_audit_events\(id\)/);
  assert.doesNotMatch(
    lateReplayMigrationSource,
    /actor_subject|actor_role|target_ref|email|token|payload|policy_json|alert_body/i,
  );

  assert.match(detectorSource, /securityDetectionContextWindowSeconds/);
  assert.match(schedulerSource, /securityDetectionContextWindowSeconds\(request\.policy\)/);
  assert.match(schedulerSource, /isNull\(securityDetectionEvaluatedEvents\.auditEventId\)/);
  assert.match(schedulerSource, /gte\(securityAuditEvents\.occurredAt, monitoringStartedAt\)/);
  assert.match(schedulerSource, /lateRows\.map\(\(row\) => row\.id\)/);
  assert.match(schedulerSource, /onConflictDoNothing/);

  // Context rows may include already-evaluated neighbors, but only the late
  // target ids themselves become newly receipted by the replay branch.
  assert.doesNotMatch(schedulerSource, /lateScan\.evaluatedEventIds/);

  // No hidden fixed lateness/lookback interval belongs in scheduler source.
  assert.doesNotMatch(schedulerSource, /lateLookback|lookbackSeconds|lateTolerance/i);

  assert.doesNotMatch(schedulerSource, /app\.(get|post|put|patch|delete)\(/);
  assert.equal(authority.lateEventReplay.alertDeliveryAuthority, false);
});

test('#805 persists bounded detector evidence without durable actor fingerprints', () => {
  assert.equal(authority.detectionHistory.issue, 805);
  assert.equal(
    authority.detectionHistory.historyTable,
    'security_detection_history',
  );
  assert.equal(
    authority.detectionHistory.evidenceTable,
    'security_detection_history_events',
  );
  assert.equal(
    authority.detectionHistory.sourceAuthority,
    'CANONICAL_SECURITY_AUDIT_EVENT_IDS_ONLY',
  );
  assert.equal(authority.detectionHistory.actorKeyPersisted, false);
  assert.equal(authority.detectionHistory.targetPayloadCopied, false);
  assert.equal(authority.detectionHistory.alertDeliveryAuthority, false);
  assert.equal(authority.detectionHistory.httpRoute, null);
  assert.match(authority.detectionHistory.retention, /POLICY_REQUIRED/);
  assert.match(authority.detectionHistory.retention, /NO_DURATION_SELECTED/);

  assert.match(
    detectionHistoryMigrationSource,
    /CREATE TABLE security_detection_history/,
  );
  assert.match(
    detectionHistoryMigrationSource,
    /CREATE TABLE security_detection_history_events/,
  );
  assert.match(
    detectionHistoryMigrationSource,
    /REFERENCES security_audit_events\(id\)/,
  );
  assert.match(
    detectionHistoryMigrationSource,
    /uq_security_detection_history_dedupe_key/,
  );
  const detectionHistoryMigrationExecutableSource =
    detectionHistoryMigrationSource.replace(/--.*$/gm, '');
  assert.doesNotMatch(
    detectionHistoryMigrationExecutableSource,
    /actor_key|actor_subject|target_ref|email|ip_address|user_agent|token|payload|request_body|response_body|free_form/i,
  );

  assert.match(detectionHistorySource, /createHash\('sha256'\)/);
  assert.match(detectionHistorySource, /sourceEventIds/);
  assert.match(detectionHistorySource, /sortedIds/);

  const historyInsert = schedulerSource.indexOf(
    '.insert(securityDetectionHistory)',
  );
  const evaluatedInsert = schedulerSource.indexOf(
    '.insert(securityDetectionEvaluatedEvents)',
  );
  const cursorWrite = schedulerSource.indexOf(
    '.insert(securityDetectionSchedulerState)',
  );

  assert.ok(historyInsert >= 0);
  assert.ok(evaluatedInsert > historyInsert);
  assert.ok(cursorWrite > evaluatedInsert);
  assert.match(schedulerSource, /security detection history evidence conflict/);
  assert.doesNotMatch(schedulerSource, /app\.(get|post|put|patch|delete)\(/);
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
