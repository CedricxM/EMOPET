import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const serviceSource = readFileSync(
  new URL('../src/services/report.ts', import.meta.url),
  'utf8',
);
const screenSource = readFileSync(
  new URL('../app/settings/health-vet.tsx', import.meta.url),
  'utf8',
);

test('vet report service never fabricates a local share grant', () => {
  assert.doesNotMatch(serviceSource, /getApiBaseUrl/);
  assert.doesNotMatch(serviceSource, /expiresInMinutes:\s*30/);
  assert.match(serviceSource, /vet_report_authentication_required/);
  assert.match(serviceSource, /vet_report_dog_selection_required/);

  const authGuard = serviceSource.indexOf('if (!normalizedToken)');
  const dogGuard = serviceSource.indexOf('if (!normalizedDogId)');
  const backendRequest = serviceSource.indexOf(
    '/api/dogs/${normalizedDogId}/vet-report-link?days=14',
  );

  assert.ok(authGuard >= 0);
  assert.ok(dogGuard > authGuard);
  assert.ok(backendRequest > dogGuard);
});

test('vet report screen checks real prerequisites before loading or sharing', () => {
  assert.doesNotMatch(
    screenSource,
    /selectedDogId\s*=.*\?\?\s*['"]demo-dog['"]/,
  );
  assert.match(
    screenSource,
    /Connectez-vous pour creer un lien de partage veterinaire\./,
  );
  assert.match(
    screenSource,
    /Selectionnez un chien avant de creer le rapport veterinaire\./,
  );

  const authGuard = screenSource.indexOf('if (!token?.trim())');
  const dogGuard = screenSource.indexOf('if (!selectedDogId?.trim())');
  const optInGuard = screenSource.indexOf('if (!vetExportOptIn)');
  const loading = screenSource.indexOf('setLoading(true)');
  const linkRequest = screenSource.indexOf(
    'createVetReportShareLink(selectedDogId, token)',
  );
  const nativeShare = screenSource.indexOf('Share.share');

  assert.ok(authGuard >= 0);
  assert.ok(dogGuard > authGuard);
  assert.ok(optInGuard > dogGuard);
  assert.ok(loading > optInGuard);
  assert.ok(linkRequest > loading);
  assert.ok(nativeShare > linkRequest);
});
