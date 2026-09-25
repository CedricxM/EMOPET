import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const authorityUrl = new URL('../../config/science/activity-variability-authority.json', import.meta.url);
const observationUrl = new URL('../../packages/eli-engine/src/ekf/observation-model.ts', import.meta.url);

test('activity variability keeps deterministic measurement separate from affective interpretation', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  assert.equal(authority.measurement.status, 'DETERMINISTIC_FEATURE_CONTRACT_COHERENT');
  assert.equal(authority.measurement.windowSeconds, 1800);
  assert.equal(authority.measurement.minimumValidSeconds, 900);
  assert.equal(authority.interpretation.status, 'EMOPET_HYPOTHESIS_UNVALIDATED');
  assert.equal(authority.interpretation.canineValidationStatus, 'NOT_PERFORMED');
});

test('implemented observation gain remains classified as unvalidated engineering parameter', async () => {
  const authority = JSON.parse(await readFile(authorityUrl, 'utf8'));
  const observation = await readFile(observationUrl, 'utf8');

  assert.equal(authority.observationModel.status, 'CONTESTED_FUNCTIONAL_FORM');
  assert.equal(authority.observationModel.implementedGain, 0.4);
  assert.equal(authority.observationModel.implementedGainProvenance, 'EMOPET_ENGINEERING_PARAMETER_UNVALIDATED');
  assert.match(observation, /EMOPET hypothesis/i);
  assert.doesNotMatch(observation, /elevated arousal makes activity more irregular\./);
});
