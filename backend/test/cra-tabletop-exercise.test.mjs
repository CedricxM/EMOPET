import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const {
  CRA_TABLETOP_MODE,
  CRA_TABLETOP_VERSION,
  runCraTabletopExercise,
} = await import('../dist/api/security/cra-tabletop-exercise.js');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../..');

function qualification(overrides = {}) {
  return {
    productComponent: 'KNOWN',
    affectedVersions: 'KNOWN',
    softwareVersions: 'KNOWN',
    releaseArtifacts: 'KNOWN',
    sbom: 'KNOWN',
    exploitation: 'UNKNOWN',
    securityImpact: 'KNOWN',
    affectedPopulation: 'UNKNOWN',
    euMarketAvailability: 'KNOWN',
    parallelDuties: 'KNOWN',
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  return {
    incidentId: 'INC-2026-001',
    awarenessAt: '2026-09-23T08:00:00Z',
    qualificationCompletedAt: '2026-09-23T11:30:00Z',
    qualification: qualification(),
    reportingDecision: {
      outcome: 'CRA_REPORT_REQUIRED',
      decidedAt: '2026-09-24T02:00:00Z',
      ownerRole: 'incident_commander',
    },
    earlyWarning: {
      disposition: 'SIMULATED_NOT_SENT',
      draftedOrBuiltAt: '2026-09-23T18:00:00Z',
      checkpointAt: '2026-09-24T06:00:00Z',
    },
    mainNotification: {
      disposition: 'SIMULATED_NOT_SENT',
      draftedOrBuiltAt: '2026-09-25T18:00:00Z',
      reviewedAt: '2026-09-25T22:00:00Z',
      checkpointAt: '2026-09-26T06:00:00Z',
    },
    parallelRegimes: {
      gdpr: 'TO_ASSESS',
      gpsrProductSafety: 'NO',
      redCe: 'TO_ASSESS',
      supplierContract: 'YES',
    },
    ...overrides,
  };
}

function detectIoMechanism(source) {
  const patterns = [
    ['fetch', /\bfetch\s*\(/],
    ['environment', /\bprocess\.env\b/],
    ['Resend', /\bnew\s+Resend\s*\(/],
    ['sendMail', /\bsendMail\s*\(/],
    ['axios', /\baxios\s*\./],
    ['http request', /\bhttps?\.request\s*\(/],
    ['socket', /\bWebSocket\s*\(/],
  ];
  return patterns.find(([, pattern]) => pattern.test(source))?.[0] ?? null;
}

test('required CRA path completes only as deterministic no-send simulation', () => {
  const result = runCraTabletopExercise(baseInput());

  assert.equal(result.version, CRA_TABLETOP_VERSION);
  assert.equal(result.mode, CRA_TABLETOP_MODE);
  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.qualificationHasUnknowns, true);
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.simulatedTasks, [
    { kind: 'CRA_24H_EARLY_WARNING', disposition: 'SIMULATED_NOT_SENT' },
    { kind: 'CRA_72H_MAIN_NOTIFICATION', disposition: 'SIMULATED_NOT_SENT' },
  ]);
});

test('not-required decision completes without fabricating report tasks', () => {
  const result = runCraTabletopExercise(baseInput({
    reportingDecision: {
      outcome: 'CRA_REPORT_NOT_REQUIRED',
      decidedAt: '2026-09-24T02:00:00Z',
      ownerRole: 'incident_commander',
    },
    earlyWarning: {
      disposition: 'NOT_REQUIRED',
      draftedOrBuiltAt: null,
      checkpointAt: null,
    },
    mainNotification: {
      disposition: 'NOT_REQUIRED',
      draftedOrBuiltAt: null,
      reviewedAt: null,
      checkpointAt: null,
    },
  }));

  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(result.simulatedTasks, []);
});

test('unresolved applicability must continue mock report preparation', () => {
  const result = runCraTabletopExercise(baseInput({
    reportingDecision: {
      outcome: 'CRA_APPLICABILITY_UNRESOLVED',
      decidedAt: '2026-09-24T02:00:00Z',
      ownerRole: 'incident_commander',
    },
  }));

  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.decision?.outcome, 'CRA_APPLICABILITY_UNRESOLVED');
  assert.equal(result.simulatedTasks.length, 2);
});

test('explicit UNKNOWN qualification facts are retained rather than silently downgraded', () => {
  const result = runCraTabletopExercise(baseInput({
    qualification: qualification({
      exploitation: 'UNKNOWN',
      affectedPopulation: 'UNKNOWN',
      releaseArtifacts: 'UNKNOWN',
      sbom: 'UNKNOWN',
    }),
  }));

  assert.equal(result.status, 'COMPLETE');
  assert.equal(result.qualificationHasUnknowns, true);
});

test('late qualification and decision checkpoints make the exercise incomplete', () => {
  const result = runCraTabletopExercise(baseInput({
    qualificationCompletedAt: '2026-09-23T12:30:00Z',
    reportingDecision: {
      outcome: 'CRA_REPORT_REQUIRED',
      decidedAt: '2026-09-24T05:00:00Z',
      ownerRole: 'incident_commander',
    },
  }));

  assert.equal(result.status, 'INCOMPLETE');
  assert.ok(result.gaps.some((gap) => gap.reason === 'qualification_late'));
  assert.ok(result.gaps.some((gap) => gap.reason === 'decision_late'));
  assert.deepEqual(result.simulatedTasks, []);
});

test('required path catches 24h, 60-68h review and 72h deadline misses', () => {
  const result = runCraTabletopExercise(baseInput({
    earlyWarning: {
      disposition: 'SIMULATED_NOT_SENT',
      draftedOrBuiltAt: '2026-09-23T21:00:00Z',
      checkpointAt: '2026-09-24T09:00:00Z',
    },
    mainNotification: {
      disposition: 'SIMULATED_NOT_SENT',
      draftedOrBuiltAt: '2026-09-25T21:00:00Z',
      reviewedAt: '2026-09-26T05:00:00Z',
      checkpointAt: '2026-09-26T09:00:00Z',
    },
  }));

  assert.equal(result.status, 'INCOMPLETE');
  const reasons = result.gaps.map((gap) => gap.reason);
  assert.ok(reasons.includes('early_warning_draft_late'));
  assert.ok(reasons.includes('early_warning_checkpoint_late'));
  assert.ok(reasons.includes('main_notification_build_late'));
  assert.ok(reasons.includes('main_notification_review_outside_window'));
  assert.ok(reasons.includes('main_notification_checkpoint_late'));
});

test('invalid chronology cannot complete the exercise', () => {
  const result = runCraTabletopExercise(baseInput({
    qualificationCompletedAt: '2026-09-23T07:59:00Z',
  }));

  assert.equal(result.status, 'INCOMPLETE');
  assert.ok(result.gaps.some((gap) => gap.reason === 'chronology_invalid'));
});

test('not-required path rejects simulated submissions', () => {
  const result = runCraTabletopExercise(baseInput({
    reportingDecision: {
      outcome: 'CRA_REPORT_NOT_REQUIRED',
      decidedAt: '2026-09-24T02:00:00Z',
      ownerRole: 'incident_commander',
    },
  }));

  assert.equal(result.status, 'INCOMPLETE');
  assert.ok(result.gaps.some((gap) => gap.reason === 'not_required_path_contains_submission'));
  assert.deepEqual(result.simulatedTasks, []);
});

test('malformed role, timezone, qualification or extra input fields fail closed', () => {
  const wrongRole = runCraTabletopExercise(baseInput({
    reportingDecision: {
      outcome: 'CRA_REPORT_REQUIRED',
      decidedAt: '2026-09-24T02:00:00Z',
      ownerRole: 'legal_regulatory',
    },
  }));
  assert.equal(wrongRole.status, 'INVALID_INPUT');

  const localTime = runCraTabletopExercise(baseInput({
    awarenessAt: '2026-09-23T08:00:00+02:00',
  }));
  assert.equal(localTime.status, 'INVALID_INPUT');

  const missingQualification = runCraTabletopExercise(baseInput({
    qualification: { productComponent: 'KNOWN' },
  }));
  assert.equal(missingQualification.status, 'INVALID_INPUT');

  const extra = runCraTabletopExercise({
    ...baseInput(),
    srpUrl: 'https://example.invalid',
  });
  assert.equal(extra.status, 'INVALID_INPUT');
});

test('CRA tabletop implementation has no network, provider or environment-backed delivery mechanism', () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, 'backend/api/security/cra-tabletop-exercise.ts'),
    'utf8',
  );

  assert.equal(detectIoMechanism(source), null);
  assert.equal(detectIoMechanism('fetch("https://example.invalid")'), 'fetch');
  assert.equal(detectIoMechanism('process.env.SRP_TOKEN'), 'environment');
});
