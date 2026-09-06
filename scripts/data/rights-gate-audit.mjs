#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];

function fail(message) {
  failures.push(message);
}

function text(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    fail(`missing required file: ${path}`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
}

function expectContains(path, needles) {
  const content = text(path);
  for (const needle of needles) {
    if (!content.includes(needle)) fail(`${path} missing control marker: ${needle}`);
  }
}

const registryPath = 'data/registry/real-datasets.json';
const registry = JSON.parse(text(registryPath) || '{"datasets":[]}');

for (const dataset of registry.datasets ?? []) {
  if (!dataset.datasetId) fail('dataset without datasetId');
  if (!dataset.evidenceState) fail(`${dataset.datasetId}: missing evidenceState`);

  const hasReceipt = typeof dataset.receiptPath === 'string' && dataset.receiptPath.length > 0;
  const hasChecksum = typeof dataset.checksumSha256 === 'string' && dataset.checksumSha256.length === 64;

  if (hasReceipt !== hasChecksum) {
    fail(`${dataset.datasetId}: receiptPath/checksumSha256 must appear together`);
  }

  if (!hasReceipt && !String(dataset.evidenceState).startsWith('RECEIPT_MISSING')) {
    fail(`${dataset.datasetId}: missing receipt must remain explicit in evidenceState`);
  }

  if (hasReceipt) {
    if (!dataset.evidenceState.includes('RECEIPT_CAPTURED')) {
      fail(`${dataset.datasetId}: captured receipt must be reflected in evidenceState`);
    }
    if (!existsSync(resolve(dataset.receiptPath))) {
      fail(`${dataset.datasetId}: receiptPath does not exist: ${dataset.receiptPath}`);
    }
  }
}

expectContains('apps/web/lib/data/breiz/sourceRegistry.ts', [
  'rightsEvidence?: BreizRightsEvidence',
  'isBreizSourceReleaseReady',
  "evidence.disposition === 'GO'",
]);

expectContains('apps/web/components/bretagne-map/CommunityMap.tsx', [
  'NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE',
  "=== 'GO'",
]);

expectContains('apps/web/components/bretagne-map/MapboxMap.tsx', [
  'NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE',
  'attributionControl: true',
]);

expectContains('apps/web/lib/osm-spots.ts', [
  'NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE',
  'sourceElementUrl',
  'licenseUrl',
]);

expectContains('backend/api/routes/directory.ts', [
  'EMOPET_LOCAL_DIRECTORY_RELEASE_GATE',
  'DATA_RIGHTS_GATE_HOLD',
  'UNVERIFIED_DEMO',
]);

expectContains('backend/db/seeds/index.ts', [
  'EMOPET_ALLOW_DEMO_LOCAL_DIRECTORY_SEED',
  'EMOPET_ALLOW_LEGACY_FREEMIUM_TEMPLATE_SEED',
]);

const seedIndex = text('backend/db/seeds/index.ts');
if (seedIndex.includes("import { LORIENT_DIRECTORY } from './local-directory-lorient.js'")) {
  fail('backend/db/seeds/index.ts directly imports uncontrolled Lorient directory seed');
}

expectContains('docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.1.md', [
  'NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY',
  'DATA-LIC-G1',
  'DATA-LIC-G8',
  'G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN',
]);

if (failures.length > 0) {
  console.error('Third-party data rights gate audit FAILED:');
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log(`Third-party data rights gate audit PASS (${registry.datasets?.length ?? 0} datasets checked).`);
console.log('PASS means control invariants are present; it is not legal clearance or release authorization.');
