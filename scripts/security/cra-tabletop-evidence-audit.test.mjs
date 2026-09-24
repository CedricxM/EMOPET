import test from 'node:test';
import assert from 'node:assert/strict';

const { auditCraTabletopEvidence, readEvidence } = await import('./cra-tabletop-evidence-audit.mjs');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('current CRA tabletop dry-run evidence is internally consistent and fail-closed', () => {
  assert.deepEqual(auditCraTabletopEvidence(readEvidence()), []);
});

test('operational-readiness promotion fails the audit', () => {
  const record = clone(readEvidence());
  record.claimsOperationalReadiness = true;
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('claimsOperationalReadiness')));
});

test('a fake real submission fails the audit', () => {
  const record = clone(readEvidence());
  record.claimsRealNotificationSubmission = true;
  record.checkpoints.find((x) => x.id === 'T24_EARLY_WARNING').submissionMode = 'SUBMITTED';
  const violations = auditCraTabletopEvidence(record);
  assert.ok(violations.some((v) => v.includes('claimsRealNotificationSubmission')));
  assert.ok(violations.some((v) => v.includes('T24_EARLY_WARNING')));
});

test('clock drift is detected', () => {
  const record = clone(readEvidence());
  record.checkpoints.find((x) => x.id === 'T72_MAIN_NOTIFICATION').simulatedAt = '2026-09-26T07:59:59.000Z';
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('T72_MAIN_NOTIFICATION timestamp')));
});

test('removing a human blocker fails the audit', () => {
  const record = clone(readEvidence());
  record.correctiveActions = record.correctiveActions.filter((x) => x.id !== 'F5_SRP_AR_ACCESS');
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('F5_SRP_AR_ACCESS')));
});

test('inventing EMOPET SRP access fails the audit', () => {
  const record = clone(readEvidence());
  record.publicCraSrpStatus.emopetAssignedRepresentativeAccessStatus = 'VERIFIED';
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('SRP access')));
});

test('inventing a release signature fails the audit', () => {
  const record = clone(readEvidence());
  record.representativeReleaseEvidence.releaseArtifactHashOrSignatureStatus = 'VERIFIED';
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('release signature')));
});

test('repository code may not fabricate human corrective-action due dates', () => {
  const record = clone(readEvidence());
  record.correctiveActions[0].dueDate = '2026-09-30';
  assert.ok(auditCraTabletopEvidence(record).some((v) => v.includes('dueDate')));
});
