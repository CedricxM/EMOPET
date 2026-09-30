import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [authoritySource, runtimeSource, workerSource] = await Promise.all([
  readFile(new URL('../../config/security/security-detection-runtime-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/security-detection-runtime.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/workers/security-detection-scan.ts', import.meta.url), 'utf8'),
]);

const authority = JSON.parse(authoritySource);

test('#525 runtime has a canonical DB source but no production-monitoring claim', () => {
  assert.equal(authority.issue, 525);
  assert.equal(authority.eventSource, 'security_audit_events');
  assert.equal(authority.httpRoute, null);
  assert.equal(authority.policy.productionValuesSelected, false);
  assert.equal(authority.policy.defaultsInRuntime, false);
  assert.equal(authority.policy.requiredPerRun, true);
  assert.equal(authority.operationalGaps.continuousScheduler, 'NOT_IMPLEMENTED');
  assert.equal(authority.operationalGaps.durableDetectionHistory, 'NOT_IMPLEMENTED');
  assert.equal(authority.operationalGaps.alertDelivery, 'OPEN_UNDER_526');
});

test('runtime requires explicit window, policy revision, policy and event bound', () => {
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

test('worker emits only the redacted summary and creates no HTTP surface', () => {
  assert.match(workerSource, /summarizeSecurityDetectionRuntimeResult/);
  assert.doesNotMatch(workerSource, /result\.detections/);
  assert.doesNotMatch(workerSource, /actorKey/);
  assert.doesNotMatch(workerSource, /targetRef/);

  assert.doesNotMatch(runtimeSource, /app\.(get|post|put|patch|delete)\(/);
  assert.doesNotMatch(workerSource, /app\.(get|post|put|patch|delete)\(/);
});
