import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('physical activity feature read authority stays Owner-scoped, uncertainty-aware and non-affective', async () => {
  const source = await readFile(
    new URL('../api/services/activity-variability-feature-read.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /eq\(dogs\.ownerId, ownerId\)/);
  assert.match(source, /\.for\('share'\)/);
  assert.match(source, /PHYSICAL_MOVEMENT_VARIABILITY_ONLY/);
  assert.match(source, /affectiveInterpretationAuthorized: false/);
  assert.match(source, /eliInvocationAuthorized: false/);
  assert.match(source, /BOUND_DEVICE_NOT_CRYPTOGRAPHICALLY_ATTESTED_BY_THIS_SLICE/);
  assert.match(source, /eventTimeUncertaintyMs/);
  assert.match(source, /BOOT_ANCHOR_V1/);
  assert.match(source, /'30d'/);
  assert.match(source, /\.limit\(1440\)/);

  for (const forbidden of ['stepEKF', 'arousal:', 'valence:', 'eliStates']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('physical feature read service remains route-less', async () => {
  const [routes, source] = await Promise.all([
    readFile(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8'),
    readFile(new URL('../api/services/activity-variability-feature-read.ts', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(routes, /readLatestActivityVariabilityObservation/);
  assert.doesNotMatch(routes, /readActivityVariabilityObservationHistory/);
  assert.match(source, /intentionally route-less/);
});
