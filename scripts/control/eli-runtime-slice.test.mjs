import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ELI runtime slice candidate stays non-publishing and non-activating', async () => {
  const configUrl = new URL('../../config/eli/runtime-slice-v1.json', import.meta.url);
  const cfg = JSON.parse(await readFile(configUrl, 'utf8'));

  assert.equal(cfg.status, 'CANDIDATE / NOT RUNTIME ACTIVATION');
  assert.equal(cfg.firstSlice.feature, 'activity_variability');
  assert.equal(cfg.firstSlice.scienceGate, 87);
  assert.equal(cfg.firstSlice.publicationMode, 'ABSTENTION_ONLY_UNTIL_SCIENCE_APPROVAL');
  assert.equal(cfg.endpoint.current501MustRemain, true);
  assert.equal(cfg.persistence.activation, 'HOLD');
  assert.equal(cfg.runtimeOwnership.humanRuntimeApprover, null);
  assert.equal(cfg.runtimeOwnership.humanScienceApprover, null);
});

test('candidate adapter invokes canonical engine but cannot project a user result', async () => {
  const url = new URL('../../backend/api/services/eli-runtime/activity-variability-slice.ts', import.meta.url);
  const source = await readFile(url, 'utf8');

  assert.match(source, /stepEKF/);
  assert.match(source, /runVetoPipeline/);
  assert.match(source, /ACTIVITY_VARIABILITY_FEATURE_CONTRACT_VERSION/);
  assert.match(source, /publicationState:\s*'SCIENCE_HOLD'/);
  assert.match(source, /userProjection:\s*null/);
  assert.doesNotMatch(source, /userProjection:\s*\{/);
});

test('current ELI API 501 remains in place while science/runtime authority is incomplete', async () => {
  const url = new URL('../../backend/api/routes/sensors.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  const occurrences = source.match(/eli_runtime_not_implemented/g) ?? [];
  assert.equal(occurrences.length, 2);
});
