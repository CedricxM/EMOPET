import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(
  new URL('../api/services/eli-runtime/physical-movement-observation.ts', import.meta.url),
  'utf8',
);
const route = await readFile(
  new URL('../api/routes/sensors.ts', import.meta.url),
  'utf8',
);
const apiTypes = await readFile(
  new URL('../../packages/shared/src/types/eli-api.ts', import.meta.url),
  'utf8',
);

test('first live #479 slice is physical-only and engine-gated', () => {
  assert.match(service, /gatePhysicalMovementObservation/);
  assert.match(service, /PHYSICAL_MOVEMENT_VARIABILITY_ONLY/);
  assert.match(service, /latentStatePublished: false/);
  assert.doesNotMatch(service, /stepEKF|eliStates|arousal:|valence:|load:/);
});

test('dedicated physical endpoint does not activate generic ELI reads', () => {
  assert.match(route, /\/eli\/:dogId\/physical-movement/);
  const generic501 = route.match(/eli_runtime_not_implemented/g) ?? [];
  assert.equal(generic501.length, 2);
});

test('shared API contract cannot masquerade as latent ELI', () => {
  assert.match(apiTypes, /PHYSICAL_MOVEMENT_VARIABILITY/);
  assert.match(apiTypes, /affectiveInterpretationAuthorized: false/);
  assert.match(apiTypes, /latentStatePublished: false/);
  assert.doesNotMatch(apiTypes, /observationKind: 'AROUSAL'/);
});
