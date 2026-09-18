import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const backendDir = join(here, '..');
const route = readFileSync(join(backendDir, 'api', 'routes', 'data-export.ts'), 'utf8');
const policy = readFileSync(join(backendDir, 'api', 'services', 'data-export-policy.ts'), 'utf8');

test('Owner export projects ELI and baseline rows through explicit publication policy', () => {
  assert.match(route, /eliRows\.map\(toOwnerAuthorizedEliExport\)/);
  assert.match(route, /baselineRows\.map\(toOwnerAuthorizedBaselineExport\)/);
  assert.doesNotMatch(route, /inferred:\s*eliRows\.map\(\(row\)\s*=>\s*\(\{\s*\.\.\.row/s);
  assert.doesNotMatch(route, /baselines:\s*baselineRows\s*[,}]/);
});

test('ELI publication policy never serializes valence, direct arousal, or sensor reliability', () => {
  const projector = policy.slice(policy.indexOf('export function toOwnerAuthorizedEliExport'));
  assert.doesNotMatch(projector, /valence:\s*row\.valence/);
  assert.doesNotMatch(projector, /arousal:\s*row\.arousal/);
  assert.doesNotMatch(projector, /sensorReliability:\s*row\.sensorReliability/);
  assert.match(projector, /row\.gateStatus === 'PUBLISH'/);
  assert.match(projector, /load:\s*row\.load/);
});

test('invalid temporal export filters fail closed instead of widening scope', () => {
  assert.match(route, /fromRaw !== undefined && !from/);
  assert.match(route, /toRaw !== undefined && !to/);
  assert.match(route, /from\.getTime\(\) > to\.getTime\(\)/);
  assert.match(route, /invalid_from/);
  assert.match(route, /invalid_to/);
  assert.match(route, /invalid_interval/);
});

test('opaque baseline metrics are withheld pending separate disclosure authority', () => {
  assert.match(policy, /metricsStatus:\s*'WITHHELD_PENDING_DISCLOSURE_AUTHORITY'/);
  const projector = policy.slice(policy.indexOf('export function toOwnerAuthorizedBaselineExport'));
  assert.doesNotMatch(projector, /metrics:\s*row\.metrics/);
});
