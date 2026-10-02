import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contract = JSON.parse(
  await readFile(
    path.join(root, 'config/validation/mat-phase0a-evidence-contract-v1.json'),
    'utf8',
  ),
);

const manifestHeader = (
  await readFile(
    path.join(root, 'docs/validation/templates/MAT_PHASE0A_run_manifest.csv'),
    'utf8',
  )
).split(/\r?\n/, 1)[0].split(',');

const sampleHeader = (
  await readFile(
    path.join(root, 'docs/validation/templates/MAT_PHASE0A_raw_samples.csv'),
    'utf8',
  )
).split(/\r?\n/, 1)[0].split(',');

const manifestMap = {
  runId: 'run_id',
  testArticleId: 'test_article_id',
  matPcbOrAssemblyRevision: 'mat_pcb_or_assembly_revision',
  sourceRevisionOrPackageHash: 'source_revision_or_package_hash',
  bomRevision: 'bom_revision',
  acquisitionConfiguration: 'acquisition_configuration',
  powerSupplyConfiguration: 'power_supply_configuration',
  sensorChannelMapping: 'sensor_channel_mapping',
  operator: 'operator',
  startedAt: 'started_at',
  timezone: 'timezone',
};

test('Phase 0A contract cannot decide MAT incremental value', () => {
  assert.equal(contract.status, 'READY_FOR_RETURNED_DATA');
  assert.equal(contract.decisionAuthority.incrementalValueDecisionAllowed, false);
  assert.equal(contract.decisionAuthority.currentDecision, null);
  assert.equal(contract.claimBoundaries.phase0aAnswersIncrementalValueGate, false);
  assert.equal(contract.claimBoundaries.benchObservabilityIsScientificValidation, false);
  assert.equal(contract.claimBoundaries.medicalOrDiagnosticClaimAllowed, false);
});

test('Phase 0A identity fields preserve test-article provenance', () => {
  for (const field of [
    'runId',
    'testArticleId',
    'matPcbOrAssemblyRevision',
    'sourceRevisionOrPackageHash',
    'bomRevision',
    'acquisitionConfiguration',
    'powerSupplyConfiguration',
    'sensorChannelMapping',
    'operator',
    'startedAt',
    'timezone',
  ]) {
    assert.ok(contract.requiredManifestFields.includes(field), field);
  }
});

test('raw samples remain reconstructable and data state is explicit', () => {
  for (const field of [
    'timestamp',
    'run_id',
    'test_article_id',
    'channel',
    'value',
    'representation',
    'sample_rate_hz',
    'acquisition_configuration',
    'supply_condition',
    'data_state',
  ]) {
    assert.ok(contract.requiredSampleFields.includes(field), field);
  }
});

test('missing data is never silently converted to zero', () => {
  assert.equal(contract.missingDataPolicy.replaceMissingWithZero, false);
  for (const state of ['MISSING', 'DROPOUT', 'NOT_RUN', 'INCONCLUSIVE']) {
    assert.ok(contract.missingDataPolicy.allowedExplicitStates.includes(state), state);
  }
});

test('checked-in templates contain every required contract column', () => {
  for (const field of contract.requiredManifestFields) {
    const csvField = manifestMap[field];
    assert.ok(csvField, `missing manifest mapping for ${field}`);
    assert.ok(manifestHeader.includes(csvField), `manifest template missing ${csvField}`);
  }

  for (const field of contract.requiredSampleFields) {
    assert.ok(sampleHeader.includes(field), `sample template missing ${field}`);
  }
});

test('template headers do not contain duplicate or empty column names', () => {
  for (const [name, header] of [
    ['manifest', manifestHeader],
    ['samples', sampleHeader],
  ]) {
    assert.equal(header.some((column) => column.trim() === ''), false, `${name} empty header`);
    assert.equal(new Set(header).size, header.length, `${name} duplicate header`);
  }
});
