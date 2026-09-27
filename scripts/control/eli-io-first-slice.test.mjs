import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('activity_variability transport gap stays explicit', async () => {
  const feature = await readFile(new URL('../../packages/shared/src/types/feature-vector.ts', import.meta.url), 'utf8');
  const frames = await readFile(new URL('../../packages/ble-protocol/src/frames/types.ts', import.meta.url), 'utf8');
  const authority = JSON.parse(await readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8'));

  assert.ok(feature.includes('activity_variability: number | null'));
  assert.equal(/activityVariability\s*:/.test(frames), false);
  assert.equal(/activity_variability\s*:/.test(frames), false);
  assert.equal(authority.currentTransport.tagPayloadContainsActivityVariability, false);
  assert.equal(authority.currentTransport.endToEndPath, false);
  assert.equal(authority.currentDecision, 'DO_NOT_ACTIVATE');
});

test('first slice assigns one computation owner without authorizing duplicate recompute', async () => {
  const authority = JSON.parse(await readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8'));
  assert.equal(authority.producer.owner, 'TAG_FIRMWARE');
  assert.equal(authority.candidateOwnership.featureComputation, 'FIRMWARE');
  assert.equal(authority.candidateOwnership.mobileRole, 'TRANSPORT_ONLY');
  assert.equal(authority.candidateOwnership.duplicateIndependentRecompute, 'PROHIBITED_UNLESS_SEPARATELY_AUTHORIZED');
});
