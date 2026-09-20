import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reportSource = readFileSync(
  new URL('../../apps/mobile/src/services/report.ts', import.meta.url),
  'utf8',
);
const absenceSource = readFileSync(
  new URL('../../apps/mobile/app/settings/absence.tsx', import.meta.url),
  'utf8',
);

test('INT-09B report service never fabricates an unauthenticated absence comparison', () => {
  assert.match(reportSource, /Aucun chien selectionne/);
  assert.match(reportSource, /Connexion requise pour charger une comparaison reelle/);
  assert.doesNotMatch(reportSource, /Mode demo/);
  assert.doesNotMatch(reportSource, /present_vocal_events_per_hour:\s*2\.1/);
  assert.doesNotMatch(reportSource, /absent_vocal_events_per_hour:\s*4\.8/);
  assert.doesNotMatch(reportSource, /confidence:\s*0\.62/);
});

test('INT-09B absence screen never substitutes demo-dog or calls without prerequisites', () => {
  assert.doesNotMatch(absenceSource, /demo-dog/);
  assert.match(absenceSource, /if \(!selectedDogId\)/);
  assert.match(absenceSource, /Selectionnez un chien pour afficher une comparaison/);
  assert.match(absenceSource, /if \(!token\)/);
  assert.match(absenceSource, /Connexion requise pour charger une comparaison issue de donnees reelles/);

  const dogGuard = absenceSource.indexOf('if (!selectedDogId)');
  const tokenGuard = absenceSource.indexOf('if (!token)');
  const request = absenceSource.indexOf('fetchAbsenceComparison(selectedDogId, token)');
  assert.ok(dogGuard >= 0 && tokenGuard > dogGuard && request > tokenGuard);
});
