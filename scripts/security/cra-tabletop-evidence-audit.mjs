import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EVIDENCE_PATH = path.join(
  REPO_ROOT,
  'docs/security/CRA_TABLETOP_DRY_RUN_2026-09-23.json',
);

const REQUIRED_FINDINGS = new Set([
  'F1_SECURITY_MAILBOX',
  'F2_BACKUP_IC',
  'F3_PRIVACY_CONTACT',
  'F4_LEGAL_CONTACT',
  'F5_SRP_AR_ACCESS',
  'F6_EVIDENCE_RETENTION',
  'F7_SUPPLIER_ESCALATION',
  'F8_RELEASE_SIGNATURE',
  'F9_CORRECTIVE_ACTION_DUE_DATES',
]);

const EXPECTED_OFFSETS = new Map([
  ['T0_AWARENESS', 0],
  ['T4_QUALIFICATION', 4],
  ['T12_CONTAINMENT', 12],
  ['T20_REPORTING_DECISION', 20],
  ['T24_EARLY_WARNING', 24],
  ['T60_MAIN_NOTIFICATION_BUILD', 60],
  ['T68_REVIEW', 68],
  ['T72_MAIN_NOTIFICATION', 72],
]);

function isCanonicalUtc(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}

export function auditCraTabletopEvidence(record) {
  const violations = [];

  if (record?.schemaVersion !== 'emopet-cra-tabletop-dry-run-v1') {
    violations.push('unexpected schemaVersion');
  }
  if (record?.status !== 'REPOSITORY_DRY_RUN_COMPLETED_WITH_OPEN_HUMAN_CORRECTIVE_ACTIONS') {
    violations.push('status must remain a dry-run-with-open-actions status');
  }

  for (const field of [
    'claimsOperationalReadiness',
    'claimsRealIncident',
    'claimsRealNotificationSubmission',
    'claimsLegalReportabilityDecision',
  ]) {
    if (record?.[field] !== false) violations.push(field + ' must be false');
  }

  if (record?.scenario?.synthetic !== true || record?.scenario?.realVulnerabilityClaim !== false) {
    violations.push('scenario must stay explicitly synthetic');
  }
  if (!isCanonicalUtc(record?.scenario?.awarenessAt)) {
    violations.push('awarenessAt must be canonical UTC');
  }

  const srp = record?.publicCraSrpStatus;
  if (srp?.srpOperationalSince !== '2026-09-11') violations.push('public SRP operational date drift');
  if (srp?.earlyWarningHours !== 24 || srp?.mainNotificationHours !== 72) {
    violations.push('CRA notification clock drift');
  }
  if (srp?.assignedRepresentativeAuthentication !== 'EU_LOGIN_WITH_MFA') {
    violations.push('AR authentication boundary drift');
  }
  if (srp?.manufacturerAssociationValidationRequiredBeforeSubmission !== false) {
    violations.push('manufacturer-association validation must not be represented as submission prerequisite');
  }
  if (srp?.emopetAssignedRepresentativeAccessStatus !== 'UNVERIFIED') {
    violations.push('EMOPET SRP access must remain UNVERIFIED without human evidence');
  }
  if (srp?.canonicalOperationalIssue !== 239) violations.push('SRP operational ownership must remain #239');
  if (!Array.isArray(srp?.sources) || srp.sources.length < 3) {
    violations.push('official public SRP sources missing');
  }

  const awarenessMs = Date.parse(record?.scenario?.awarenessAt ?? '');
  const checkpoints = new Map((record?.checkpoints ?? []).map((entry) => [entry.id, entry]));
  for (const [id, offset] of EXPECTED_OFFSETS) {
    const checkpoint = checkpoints.get(id);
    if (!checkpoint) {
      violations.push('missing checkpoint ' + id);
      continue;
    }
    if (checkpoint.offsetHours !== offset) violations.push(id + ' offsetHours drift');
    if (!isCanonicalUtc(checkpoint.simulatedAt)) {
      violations.push(id + ' simulatedAt must be canonical UTC');
      continue;
    }
    if (Date.parse(checkpoint.simulatedAt) !== awarenessMs + offset * 60 * 60 * 1000) {
      violations.push(id + ' timestamp is not awareness+' + offset + 'h');
    }
  }

  for (const id of ['T24_EARLY_WARNING', 'T72_MAIN_NOTIFICATION']) {
    const checkpoint = checkpoints.get(id);
    if (checkpoint?.submissionMode !== 'SIMULATED_NOT_SUBMITTED') {
      violations.push(id + ' must never claim a real submission');
    }
  }

  const decision = checkpoints.get('T20_REPORTING_DECISION');
  if (decision?.outcome !== 'TABLETOP_ASSUME_REPORT_REQUIRED_FOR_EXERCISE_ONLY' || decision?.legalDecisionClaim !== false) {
    violations.push('T20 must stay an exercise assumption, not a legal decision');
  }

  const finalHandoff = checkpoints.get('FINAL_REPORT_HANDOFF');
  if (finalHandoff?.finalDeadlineStatus !== 'UNRESOLVED_PENDING_CORRECTIVE_MEASURE_TIMESTAMP') {
    violations.push('AEV final deadline must remain unresolved until corrective-measure timestamp exists');
  }

  const release = record?.representativeReleaseEvidence;
  if (release?.status !== 'PARTIAL_REPOSITORY_TRACEABILITY_ONLY') {
    violations.push('release evidence must remain partial');
  }
  if (release?.securitySupplyChainRunConclusion !== 'PASS') {
    violations.push('representative Security supply chain evidence must be PASS');
  }
  if (!Array.isArray(release?.sbomArtifacts) || release.sbomArtifacts.length < 2) {
    violations.push('representative SBOM evidence missing');
  }
  if (release?.releaseArtifactHashOrSignatureStatus !== 'NOT_ESTABLISHED') {
    violations.push('release signature must not be promoted');
  }
  if (release?.physicalFirmwareReleaseArtifactStatus !== 'NOT_ESTABLISHED') {
    violations.push('physical firmware release evidence must not be promoted');
  }

  const findings = new Map((record?.correctiveActions ?? []).map((entry) => [entry.id, entry]));
  for (const id of REQUIRED_FINDINGS) {
    const finding = findings.get(id);
    if (!finding) {
      violations.push('missing corrective action ' + id);
      continue;
    }
    if (!String(finding.status ?? '').startsWith('OPEN_')) {
      violations.push(id + ' must remain OPEN in this dated dry-run');
    }
    if (!finding.ownerRole) violations.push(id + ' missing ownerRole');
    if (finding.dueDate !== 'TO_SET_BY_HUMAN_OWNER') {
      violations.push(id + ' dueDate must not be fabricated by repository code');
    }
  }

  if (record?.closureBoundary?.issue37MayClose !== false) violations.push('#37 closure must remain false');
  if (record?.closureBoundary?.issue239MayClose !== false) violations.push('#239 closure must remain false');

  return violations;
}

export function readEvidence() {
  return JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
}

function main() {
  const violations = auditCraTabletopEvidence(readEvidence());
  if (violations.length > 0) {
    console.error('CRA tabletop evidence audit failed:');
    for (const violation of violations) console.error('- ' + violation);
    process.exitCode = 1;
    return;
  }

  console.log('CRA tabletop dry-run evidence: internally consistent and fail-closed.');
  console.log('This PASS is documentary integrity only; it is not operational CRA readiness.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
