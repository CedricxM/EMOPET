import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contract = JSON.parse(
  await readFile(path.join(root, 'config/validation/mat-phase0a-evidence-contract-v1.json'), 'utf8'),
);

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

test('raw samples remain reconstructable', () => {
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
  ]) {
    assert.ok(contract.requiredSampleFields.includes(field), field);
  }
});

test('missing data is never silently converted to zero', () => {
  assert.equal(contract.missingDataPolicy.replaceMissingWithZero, false);
  assert.ok(contract.missingDataPolicy.allowedExplicitStates.includes('MISSING'));
  assert.ok(contract.missingDataPolicy.allowedExplicitStates.includes('DROPOUT'));
  assert.ok(contract.missingDataPolicy.allowedExplicitStates.includes('NOT_RUN'));
  assert.ok(contract.missingDataPolicy.allowedExplicitStates.includes('INCONCLUSIVE'));
});
