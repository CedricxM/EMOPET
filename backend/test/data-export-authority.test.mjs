import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [route, policy] = await Promise.all([
  readFile(new URL('../api/routes/data-export.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/services/data-export-policy.ts', import.meta.url), 'utf8'),
]);

test('Owner export projects persisted rows through explicit publication policy', () => {
  assert.match(route, /summaryRows\.map\(toOwnerAuthorizedSensorSummaryExport\)/);
  assert.match(route, /eliRows\.map\(toOwnerAuthorizedEliExport\)/);
  assert.match(route, /baselineRows\.map\(toOwnerAuthorizedBaselineExport\)/);
  assert.doesNotMatch(route, /preprocessed:\s*summaryRows\.map\(\(row\)\s*=>\s*\(\{\s*\.\.\.row/s);
  assert.doesNotMatch(route, /inferred:\s*eliRows\.map\(\(row\)\s*=>\s*\(\{\s*\.\.\.row/s);
});

test('sensor export keeps retry identity internal while exposing useful provenance', () => {
  const projector = policy.slice(policy.indexOf('export function toOwnerAuthorizedSensorSummaryExport'));
  assert.match(projector, /deviceId:\s*row\.deviceId/);
  assert.match(projector, /firmwareVersionAtIngest:\s*row\.firmwareVersionAtIngest/);
  assert.match(projector, /durationMinutes:\s*60/);
  assert.match(projector, /timestampAnchor:\s*'UNSPECIFIED_BY_CURRENT_CONTRACT'/);
  assert.doesNotMatch(projector, /ingestionId:\s*row\.ingestionId/);
});

test('ELI and baseline export remain publication-gated', () => {
  const eliProjector = policy.slice(
    policy.indexOf('export function toOwnerAuthorizedEliExport'),
    policy.indexOf('export function toOwnerAuthorizedBaselineExport'),
  );
  assert.doesNotMatch(eliProjector, /valence:\s*row\.valence/);
  assert.doesNotMatch(eliProjector, /arousal:\s*row\.arousal/);
  assert.doesNotMatch(eliProjector, /sensorReliability:\s*row\.sensorReliability/);
  assert.match(eliProjector, /row\.gateStatus === 'PUBLISH'/);

  const baselineProjector = policy.slice(policy.indexOf('export function toOwnerAuthorizedBaselineExport'));
  assert.match(baselineProjector, /metricsStatus:\s*'WITHHELD_PENDING_DISCLOSURE_AUTHORITY'/);
  assert.doesNotMatch(baselineProjector, /metrics:\s*row\.metrics/);
});

test('export authorization and collection are one bounded transaction', () => {
  assert.match(route, /db\.transaction/);
  assert.match(route, /SET LOCAL lock_timeout = '5s'/);
  assert.match(route, /SET LOCAL statement_timeout = '10s'/);
  assert.match(route, /\.for\('share'\)/);
  assert.match(route, /DATA_EXPORT_UNAVAILABLE/);
  assert.match(route, /private, no-store/);
  assert.match(route, /X-Content-Type-Options/);
});

test('invalid identity and temporal bounds fail closed before attachment delivery', () => {
  assert.match(route, /isCanonicalUserId\(dogId\)/);
  assert.match(route, /invalid_dog_id/);
  assert.match(route, /invalid_from/);
  assert.match(route, /invalid_to/);
  assert.match(route, /from_after_to/);
});

test('CSV formula-like text is emitted as literal text', () => {
  assert.match(route, /trimStart\(\)/);
  assert.match(route, /＝＋－＠/u);
  assert.match(route, /csvTextPolicy:\s*'FORMULA_LIKE_TEXT_PREFIXED_WITH_APOSTROPHE'/);
});

test('capabilities describe this as a partial current-backend projection', () => {
  assert.match(route, /dogPersistenceCoverage:\s*'PARTIAL_CURRENT_BACKEND_PROJECTION'/);
  assert.match(route, /not a complete dump of every dog-linked PostgreSQL relation/i);
});
