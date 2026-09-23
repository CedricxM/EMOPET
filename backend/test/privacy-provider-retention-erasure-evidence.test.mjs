import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const privacyUrl = new URL('../../config/privacy/', import.meta.url);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, privacyUrl), 'utf8'));
}

const evidence = await readJson('provider-retention-erasure-evidence.json');
const inventory = await readJson('non-sql-erasure-surface-inventory.json');

const byProvider = Object.fromEntries(
  evidence.providers.map((row) => [row.provider, row]),
);

test('provider evidence is dated public-documentation evidence, never production or deletion proof', () => {
  assert.equal(evidence.schemaVersion, 'emopet-provider-retention-erasure-evidence-v1');
  assert.equal(evidence.verifiedAt, '2026-09-21');
  assert.equal(
    evidence.status,
    'OFFICIAL_PUBLIC_PROVIDER_EVIDENCE_ONLY_ENVIRONMENT_AND_EXECUTION_UNVERIFIED',
  );
  assert.equal(evidence.claimsProductionEnablement, false);
  assert.equal(evidence.claimsProviderDeletionExecuted, false);
  assert.equal(evidence.claimsCompleteErasure, false);

  for (const row of evidence.providers) {
    assert.notEqual(row.emopetErasureReadiness.operationalReceiptStatus, 'VERIFIED');
    assert.equal(row.repositoryFlow.canonicalSubjectIdSent, false);
    assert.equal(row.repositoryFlow.providerObjectIdPersistedByEmopet, false);
  }
});

test('current provider evidence inventory covers all repository-active external copy/analytics providers under review', () => {
  assert.deepEqual(
    Object.keys(byProvider).sort(),
    [
      'Anthropic',
      'Mapbox',
      'Open-Meteo',
      'OpenStreetMap_Overpass',
      'OpenWeatherMap',
      'Plausible',
      'Resend',
    ].sort(),
  );
});

test('Resend evidence keeps public TTL separate from subject-specific operational erasure', () => {
  const row = byProvider.Resend;
  assert.equal(row.publicEvidence.status, 'OFFICIAL_PUBLIC_POLICY_FOUND');
  assert.ok(row.publicEvidence.retention.some((v) => /30 days/.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /90 days/.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /7 days/.test(v)));
  assert.match(row.publicEvidence.earlyRemoval, /specific message/i);
  assert.equal(
    row.emopetErasureReadiness.subjectMapping,
    'INSUFFICIENT_FOR_PROVIDER_MESSAGE_ERASURE',
  );
  assert.equal(row.emopetErasureReadiness.operationalReceiptStatus, 'NOT_AVAILABLE');
});

test('Anthropic evidence records bounded default API retention without pretending configuration is known', () => {
  const row = byProvider.Anthropic;
  assert.equal(row.publicEvidence.status, 'OFFICIAL_PUBLIC_POLICY_FOUND');
  assert.ok(row.publicEvidence.retention.some((v) => /within 30 days/i.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /zero-data-retention/i.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /Covered Models/i.test(v)));
  assert.ok(row.emopetErasureReadiness.configurationEvidenceNeeded.includes('ACTUAL_MODEL_RESOLUTION'));
  assert.ok(row.emopetErasureReadiness.configurationEvidenceNeeded.includes('RETENTION_OR_ZDR_CONFIGURATION'));
});

test('Plausible current root integration has no canonical subject identifier or custom-property wiring', async () => {
  const row = byProvider.Plausible;
  assert.equal(
    row.emopetErasureReadiness.subjectMapping,
    'NO_CANONICAL_EMOPET_SUBJECT_IDENTIFIER_IN_CURRENT_ROOT_INTEGRATION',
  );
  assert.ok(row.publicEvidence.retention.some((v) => /raw IP addresses/i.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /24 hours/i.test(v)));
  assert.ok(row.publicEvidence.retention.some((v) => /persistent visitor identifiers/i.test(v)));

  const layout = await readFile(new URL('../../apps/web/app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /data-domain=\{PLAUSIBLE_DOMAIN\}/);
  assert.match(layout, /https:\/\/plausible\.io\/js\/script\.js/);
  assert.equal(/data-[a-z-]*user/i.test(layout), false);
  assert.equal(/plausible\s*\(/.test(layout), false);
});

test('weather providers remain separate because web Open-Meteo and backend OpenWeatherMap are different flows', async () => {
  const providerSurface = inventory.surfaces.find((row) => row.surface === 'PROVIDER_HELD_COPIES');
  const names = providerSurface.providers.map((row) => row.provider);

  assert.ok(names.includes('Open-Meteo'));
  assert.ok(names.includes('OpenWeatherMap'));
  assert.equal(names.includes('OpenMeteo_and_weather_providers'), false);

  assert.equal(byProvider['Open-Meteo'].publicEvidence.status, 'OFFICIAL_PUBLIC_POLICY_FOUND');
  assert.ok(
    byProvider['Open-Meteo'].publicEvidence.retention.some((v) => /90 days/i.test(v)),
  );

  assert.equal(
    byProvider.OpenWeatherMap.publicEvidence.status,
    'RETENTION_AND_SUBJECT_ERASURE_POLICY_NOT_ESTABLISHED_BY_CURRENT_OFFICIAL_EVIDENCE_REVIEW',
  );
  assert.equal(
    byProvider.OpenWeatherMap.emopetErasureReadiness.blocker,
    'AUTHORITATIVE_PROVIDER_RETENTION_AND_ERASURE_EVIDENCE_REQUIRED',
  );

  const backendWeather = await readFile(
    new URL('../api/services/weather.ts', import.meta.url),
    'utf8',
  );
  assert.match(backendWeather, /api\.openweathermap\.org/);
  assert.match(backendWeather, /OPENWEATHERMAP_API_KEY/);
});

test('Mapbox and Overpass repository-flow evidence follows the reviewed HOLD runtime boundaries', async () => {
  assert.equal(
    byProvider.Mapbox.repositoryFlow.status,
    'REVIEWED_AUTHORITY_GATED_CLIENT_INTEGRATION_CURRENTLY_HOLD',
  );
  assert.equal(
    byProvider.OpenStreetMap_Overpass.repositoryFlow.status,
    'REVIEWED_AUTHORITY_GATED_RUNTIME_INTEGRATION_CURRENTLY_HOLD',
  );

  const mapboxAuthority = await readFile(
    new URL('../../apps/web/lib/mapbox-service-authority.ts', import.meta.url),
    'utf8',
  );
  const overpassAuthority = await readFile(
    new URL('../../apps/web/lib/overpass-rights.ts', import.meta.url),
    'utf8',
  );
  assert.match(mapboxAuthority, /disposition:\s*'HOLD'/);
  assert.match(overpassAuthority, /disposition:\s*'HOLD'/);

  assert.match(byProvider.Mapbox.emopetErasureReadiness.subjectMapping, /NO_CANONICAL_EMOPET_SUBJECT_IDENTIFIER/);
  assert.match(byProvider.OpenStreetMap_Overpass.emopetErasureReadiness.subjectMapping, /NO_CANONICAL_EMOPET_SUBJECT_IDENTIFIER/);
  assert.equal(
    byProvider.OpenStreetMap_Overpass.publicEvidence.status,
    'OPERATOR_RETENTION_AND_SUBJECT_ERASURE_POLICY_NOT_ESTABLISHED_BY_CURRENT_REVIEW',
  );
});

test('Mapbox and Overpass remain non-addressable by canonical EMOPET subject id', () => {
  assert.match(byProvider.Mapbox.emopetErasureReadiness.subjectMapping, /NO_CANONICAL_EMOPET_SUBJECT_IDENTIFIER/);
  assert.match(byProvider.OpenStreetMap_Overpass.emopetErasureReadiness.subjectMapping, /NO_CANONICAL_EMOPET_SUBJECT_IDENTIFIER/);
  assert.equal(
    byProvider.OpenStreetMap_Overpass.publicEvidence.status,
    'OPERATOR_RETENTION_AND_SUBJECT_ERASURE_POLICY_NOT_ESTABLISHED_BY_CURRENT_REVIEW',
  );
});

test('non-SQL inventory links provider evidence but cannot upgrade any erasure probe', () => {
  assert.equal(
    inventory.providerEvidenceRegistry,
    'config/privacy/provider-retention-erasure-evidence.json',
  );
  assert.equal(inventory.claimsCompleteErasure, false);
  assert.equal(inventory.claimsProviderDeletion, false);
  assert.equal(inventory.claimsProductionAbsence, false);

  for (const surface of inventory.surfaces) {
    assert.equal(surface.erasureProbeStatus, 'NOT_IMPLEMENTED');
  }
});
