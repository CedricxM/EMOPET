import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const absenceSource = readFileSync(
  new URL('../../apps/mobile/app/settings/absence.tsx', import.meta.url),
  'utf8',
);
const reportSource = readFileSync(
  new URL('../../apps/mobile/src/services/report.ts', import.meta.url),
  'utf8',
);
const vetSource = readFileSync(
  new URL('../../apps/mobile/app/settings/health-vet.tsx', import.meta.url),
  'utf8',
);

test('INT-09B requires a real selected dog and authenticated session', () => {
  assert.doesNotMatch(absenceSource, /demo-dog/);
  assert.match(absenceSource, /if \(!selectedDogId\)/);
  assert.match(absenceSource, /if \(!token\)/);
  assert.match(absenceSource, /fetchAbsenceComparison\(selectedDogId, token\)/);

  assert.match(reportSource, /if \(!dogId\.trim\(\)\)/);
  assert.match(reportSource, /if \(!token\)/);
  assert.doesNotMatch(reportSource, /Mode demo:/);
  assert.doesNotMatch(reportSource, /present_vocal_events_per_hour:\s*2\.1/);
});

test('INT-09C removes generic veterinary bearer-link sharing from mobile', () => {
  assert.match(
    reportSource,
    /PROFESSIONAL_SHARE_STATUS\s*=\s*['"]RECIPIENT_BOUND_GRANT_REQUIRED['"]/,
  );
  assert.doesNotMatch(reportSource, /createVetReportShareLink/);
  assert.doesNotMatch(reportSource, /getApiBaseUrl/);
  assert.doesNotMatch(vetSource, /Share\.share/);
  assert.doesNotMatch(vetSource, /createVetReportShareLink/);
  assert.match(vetSource, /Elle ne donne acces a aucune clinique et ne partage aucune donnee a elle seule/);
  assert.match(vetSource, /<Pressable style=\{styles\.disabledButton\} disabled/);
  assert.match(vetSource, /Creer un acces pour mon veterinaire/);
});
