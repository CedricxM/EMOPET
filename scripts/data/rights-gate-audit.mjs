#!/usr/bin/env node

import { createHash } from 'node:crypto';
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

function bytes(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) {
    fail(`missing required file: ${path}`);
    return Buffer.alloc(0);
  }
  return readFileSync(absolute);
}

function json(path, fallback) {
  const content = text(path);
  if (!content) return fallback;
  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${path}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return fallback;
  }
}

function expectContains(path, needles) {
  const content = text(path);
  for (const needle of needles) {
    if (!content.includes(needle)) fail(`${path} missing control marker: ${needle}`);
  }
}

const registryPath = 'data/registry/real-datasets.json';
const registry = json(registryPath, { datasets: [] });

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

// DATA-LIC-G2 committed-snapshot traceability.
// This proves only internal consistency of the committed VBO payload and its
// generated derivatives. It is deliberately not an upstream retrieval receipt
// and not licence/product-use clearance.
const vboEvidencePath = 'data/vbo/committed-snapshot-evidence.json';
const vboEvidence = json(vboEvidencePath, {});
const vboPayload = bytes('data/vbo/vbo.json');
const vboSha256 = vboPayload.length > 0
  ? createHash('sha256').update(vboPayload).digest('hex')
  : '';

if (vboEvidence.status !== 'COMMITTED_SNAPSHOT_TRACEABILITY_ONLY_UPSTREAM_RECEIPT_OPEN') {
  fail(`${vboEvidencePath}: committed snapshot status must remain explicitly non-conclusive`);
}
if (vboEvidence.claimsUpstreamReleaseEquivalence !== false) {
  fail(`${vboEvidencePath}: must not claim upstream release equivalence`);
}
if (vboEvidence.claimsProductUseClearance !== false) {
  fail(`${vboEvidencePath}: must not claim product-use clearance`);
}
if (vboEvidence.upstreamRetrievalReceiptStatus !== 'RECEIPT_MISSING') {
  fail(`${vboEvidencePath}: upstream receipt must remain RECEIPT_MISSING until independent evidence exists`);
}
if (vboEvidence.payloadSha256 !== vboSha256) {
  fail(`${vboEvidencePath}: payloadSha256 does not match committed data/vbo/vbo.json`);
}
if (Number(vboEvidence.payloadBytes) !== vboPayload.length) {
  fail(`${vboEvidencePath}: payloadBytes does not match committed data/vbo/vbo.json`);
}
if (vboEvidence.versionTag !== vboSha256.slice(0, 12)) {
  fail(`${vboEvidencePath}: versionTag must equal the first 12 hex characters of payload SHA-256`);
}

const datasetVersionSql = text('data/vbo/dataset_version_insert.sql');
const datasetVersionMatch = datasetVersionSql.match(
  /VALUES\s*\(\s*'vbo'\s*,\s*'([0-9a-f]{12})'\s*,\s*'([0-9a-f]{64})'\s*,\s*(\d+)\s*,/i,
);
if (!datasetVersionMatch) {
  fail('data/vbo/dataset_version_insert.sql: unable to parse VBO version/checksum/record_count');
}

const sqlVersionTag = datasetVersionMatch?.[1]?.toLowerCase() ?? '';
const sqlChecksum = datasetVersionMatch?.[2]?.toLowerCase() ?? '';
const sqlRecordCount = Number(datasetVersionMatch?.[3] ?? NaN);

if (sqlChecksum !== vboSha256) {
  fail('data/vbo/dataset_version_insert.sql: checksum does not match committed VBO payload');
}
if (sqlVersionTag !== vboSha256.slice(0, 12)) {
  fail('data/vbo/dataset_version_insert.sql: version tag does not match payload checksum prefix');
}
if (sqlVersionTag !== vboEvidence.versionTag) {
  fail(`${vboEvidencePath}: versionTag disagrees with dataset_version_insert.sql`);
}
if (sqlChecksum !== vboEvidence.payloadSha256) {
  fail(`${vboEvidencePath}: payloadSha256 disagrees with dataset_version_insert.sql`);
}
if (sqlRecordCount !== Number(vboEvidence.derivedRecordCount)) {
  fail(`${vboEvidencePath}: derivedRecordCount disagrees with dataset_version_insert.sql`);
}

const canonicalBreeds = json('data/vbo/breed_canonical.json', []);
if (!Array.isArray(canonicalBreeds)) {
  fail('data/vbo/breed_canonical.json: expected an array');
} else {
  if (canonicalBreeds.length !== sqlRecordCount) {
    fail(`data/vbo/breed_canonical.json: expected ${sqlRecordCount} rows, found ${canonicalBreeds.length}`);
  }

  const vboIds = new Set();
  const retrievalTimes = new Set();
  for (const [index, breed] of canonicalBreeds.entries()) {
    const label = breed?.vbo_id ?? `row_${index}`;
    if (typeof breed?.vbo_id !== 'string' || !breed.vbo_id.startsWith('VBO:')) {
      fail(`data/vbo/breed_canonical.json: ${label} missing canonical VBO id`);
    } else if (vboIds.has(breed.vbo_id)) {
      fail(`data/vbo/breed_canonical.json: duplicate VBO id ${breed.vbo_id}`);
    } else {
      vboIds.add(breed.vbo_id);
    }

    const provenance = breed?.provenance;
    if (!provenance || provenance.source !== 'vbo') {
      fail(`data/vbo/breed_canonical.json: ${label} missing vbo provenance source`);
      continue;
    }
    if (provenance.version !== vboEvidence.versionTag) {
      fail(`data/vbo/breed_canonical.json: ${label} provenance version does not match committed payload`);
    }
    if (provenance.license !== vboEvidence.repositoryLicenseLabel) {
      fail(`data/vbo/breed_canonical.json: ${label} licence label differs from committed snapshot evidence`);
    }
    if (provenance.attribution !== vboEvidence.repositoryAttribution) {
      fail(`data/vbo/breed_canonical.json: ${label} attribution differs from committed snapshot evidence`);
    }
    if (typeof provenance.retrieved_at !== 'string' || Number.isNaN(Date.parse(provenance.retrieved_at))) {
      fail(`data/vbo/breed_canonical.json: ${label} has invalid retrieved_at provenance`);
    } else {
      retrievalTimes.add(provenance.retrieved_at);
    }
  }

  if (retrievalTimes.size !== 1) {
    fail(`data/vbo/breed_canonical.json: expected one shared committed retrieval timestamp, found ${retrievalTimes.size}`);
  }
  const [observedRetrievedAt] = retrievalTimes;
  if (observedRetrievedAt !== vboEvidence.observedRetrievedAtFromCommittedDerivatives) {
    fail(`${vboEvidencePath}: observed retrieval timestamp disagrees with committed derivatives`);
  }
}

expectContains('scripts/ingest_vbo.ts', [
  "createHash('sha256')",
  "source: 'vbo'",
  "license: 'CC-BY-4.0'",
  "resolve(dataDir, 'vbo.json')",
  "resolve(dataDir, 'breed_canonical.json')",
  "resolve(dataDir, 'dataset_version_insert.sql')",
]);

// DATA-LIC-G6: catalogue enablement is not release authority. Keep the source
// helper fail-closed unless reviewed evidence is SOURCE_CONFIRMED + GO, carries
// the required receipt/attribution/use fields, has a valid non-future review
// timestamp, and has not passed an optional recheck deadline.
expectContains('apps/web/lib/data/breiz/sourceRegistry.ts', [
  'rightsEvidence?: BreizRightsEvidence',
  'isBreizSourceReleaseReady',
  "evidence.evidenceState !== 'SOURCE_CONFIRMED'",
  "evidence.disposition !== 'GO'",
  'reviewedAt == null || reviewedAt > nowMs',
  'recheckAt == null || recheckAt <= nowMs',
  'getBreizReleaseReadySources',
]);

// Raw/local files are intake only. They must not be able to assign themselves
// verified/public-answer authority, even if those fields are present in input.
expectContains('apps/web/lib/data/breiz/ingestDocuments.ts', [
  'normalizeIngestedUsage',
  'normalizeIngestedReliability',
  "if (value === 'do_not_answer')",
  "if (value === 'internal_reference')",
  "return 'retrieval_only'",
  "return 'unknown'",
]);

// Public retrieval must bind every candidate chunk back to the controlled
// source registry and require that source to pass the reviewed GO helper.
expectContains('apps/web/lib/data/breiz/breizRetriever.ts', [
  'getBreizSource',
  'isBreizSourceReleaseReady',
  "chunk.metadata.allowed_usage !== 'public_answer_with_source'",
  "chunk.metadata.reliability_level !== 'source_verified'",
  'chunk.metadata.source_registry_id?.trim()',
  'isBreizSourceReleaseReady(source)',
]);

// The registry binding must survive vector-store serialization; otherwise a
// future external vector backend could lose the authority key after chunking.
expectContains('apps/web/lib/data/breiz/chunkDocuments.ts', [
  'source_registry_id: chunk.metadata.source_registry_id ?? null',
]);

const breizMocks = text('apps/web/lib/data/breiz/mockDocuments.ts');
if (breizMocks.includes("allowed_usage: 'public_answer_with_source'")) {
  fail('apps/web/lib/data/breiz/mockDocuments.ts must not grant public-answer authority to mock corpus');
}

// DATA-LIC-G5: both map entrypoints must share the same exact runtime authority
// helper. The helper requires a non-empty token and an exact GO rights gate;
// this proves fail-closed runtime wiring only, not account/terms/billing authority.
expectContains('apps/web/lib/mapbox-rights.ts', [
  'getControlledMapboxToken',
  'NEXT_PUBLIC_MAPBOX_TOKEN',
  'NEXT_PUBLIC_EMOPET_MAPBOX_RIGHTS_GATE',
  "rightsGate !== 'GO'",
]);

expectContains('apps/web/components/bretagne-map/CommunityMap.tsx', [
  'getControlledMapboxToken',
  'HAS_CONTROLLED_MAPBOX',
]);

expectContains('apps/web/components/bretagne-map/MapboxMap.tsx', [
  'getControlledMapboxToken',
  'attributionControl: true',
  '© OpenStreetMap contributors',
  'OSM_COPYRIGHT_URL',
]);

// DATA-LIC-G4: Overpass remains opt-in and returned OSM data carries source +
// licence pointers. The only cache in this module must remain bounded and
// expiring process/browser memory, not a persistent accumulating OSM store.
expectContains('apps/web/lib/osm-spots.ts', [
  'NEXT_PUBLIC_EMOPET_OVERPASS_RIGHTS_GATE',
  'sourceElementUrl',
  'licenseUrl',
  'CACHE_TTL_MS = 5 * 60 * 1000',
  'MAX_CACHE_ENTRIES = 40',
  'expiresAt',
  'while (cache.size > MAX_CACHE_ENTRIES)',
]);

expectContains('backend/api/routes/directory.ts', [
  'EMOPET_LOCAL_DIRECTORY_RELEASE_GATE',
  'DATA_RIGHTS_GATE_HOLD',
  'UNVERIFIED_DEMO',
]);

// The master seed may delegate the environment gate to a dedicated policy
// module. Audit both sides of that boundary so a harmless refactor does not
// fail merely because the literal env var moved, while the fail-closed control
// still has to exist and be invoked by the seed entrypoint.
expectContains('backend/db/seeds/index.ts', [
  'isDemoLocalDirectorySeedAllowed',
  'getSanitizedDemoLocalDirectorySeed',
  'EMOPET_ALLOW_LEGACY_FREEMIUM_TEMPLATE_SEED',
]);

expectContains('backend/db/seeds/local-directory-policy.ts', [
  'EMOPET_ALLOW_DEMO_LOCAL_DIRECTORY_SEED',
  "=== '1'",
  "LOCAL_DIRECTORY_SEED_AUTHORITY = 'UNVERIFIED_DEMO_ONLY'",
  'ratingAvg: null',
  'verified: false',
  "source: 'demo_unverified'",
]);

const seedIndex = text('backend/db/seeds/index.ts');
if (seedIndex.includes("import { LORIENT_DIRECTORY } from './local-directory-lorient.js'")) {
  fail('backend/db/seeds/index.ts directly imports uncontrolled Lorient directory seed');
}

// v0.1 remains historical evidence. v0.2 is the current reconciled register
// and must keep the aggregate HOLD/OPEN posture plus the corrected G2/G6 states.
expectContains('docs/control/EMOPET_THIRD_PARTY_DATA_RIGHTS_REGISTER_v0.2.md', [
  'NOT LEGAL SIGN-OFF / NOT RELEASE AUTHORITY',
  'DATA-LIC-G1',
  'DATA-LIC-G8',
  'IMMUTABLE UPSTREAM COMMIT MATCH PROVEN',
  'FAIL-CLOSED ENGINEERING BOUNDARY PRESENT',
  'G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN',
]);

if (failures.length > 0) {
  console.error('Third-party data rights gate audit FAILED:');
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log(`Third-party data rights gate audit PASS (${registry.datasets?.length ?? 0} datasets checked).`);
console.log(`VBO committed snapshot traceability PASS (${sqlRecordCount} derived rows; SHA-256 ${vboSha256}).`);
console.log('PASS means control invariants are present; it is not legal clearance or release authorization.');