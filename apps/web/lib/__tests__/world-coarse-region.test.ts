import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  WORLD_COARSE_REGION_CODES,
  resolveExplicitWorldCoarseRegion,
} from '../world-coarse-region';

const catalog = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-regional-collections-v1.json', import.meta.url),
    'utf8',
  ),
);
const transition = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-region-transition-v1.json', import.meta.url),
    'utf8',
  ),
);
const source = readFileSync(new URL('../world-coarse-region.ts', import.meta.url), 'utf8');

test('coarse-region provider mirrors the canonical World regional catalogue', () => {
  assert.deepEqual(
    [...WORLD_COARSE_REGION_CODES],
    catalog.collections.map((collection: { regionCode: string }) => collection.regionCode),
  );
  assert.equal(catalog.selectionAuthority, 'explicit-coarse-region-code');
  assert.equal(catalog.exactLocationAccepted, false);
  assert.equal(catalog.automaticLocationReward, false);
});

test('explicit regional selection normalizes known codes and fails closed to GLOBAL', () => {
  assert.equal(resolveExplicitWorldCoarseRegion('FR-BRE'), 'FR-BRE');
  assert.equal(resolveExplicitWorldCoarseRegion(' fr-bre '), 'FR-BRE');
  assert.equal(resolveExplicitWorldCoarseRegion('global'), 'GLOBAL');
  assert.equal(resolveExplicitWorldCoarseRegion('FR-IDF'), 'GLOBAL');
  assert.equal(resolveExplicitWorldCoarseRegion('47.75,-3.36'), 'GLOBAL');
  assert.equal(resolveExplicitWorldCoarseRegion('Lorient'), 'GLOBAL');
  assert.equal(resolveExplicitWorldCoarseRegion({ latitude: 47.75, longitude: -3.36 }), 'GLOBAL');
  assert.equal(resolveExplicitWorldCoarseRegion(null), 'GLOBAL');
});

test('provider preserves explicit-transition rules and has no implicit location or storage authority', () => {
  assert.equal(transition.automaticRegionSwitch, false);
  assert.equal(transition.switchReward, false);
  assert.equal(transition.ownershipPersistsAcrossRegionSwitch, true);

  assert.doesNotMatch(source, /navigator\s*\.\s*geolocation/);
  assert.doesNotMatch(source, /(?:window\.)?(?:localStorage|sessionStorage)\s*\.(?:getItem|setItem|removeItem|clear)\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /watchPosition|getCurrentPosition/);
});
