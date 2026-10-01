import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  detectRegion,
  resolveRegionalCompanionContext,
} from '../detect-region';

test('regional detection defaults to neutral EMOPET when no supported territory exists', () => {
  const result = detectRegion({});

  assert.equal(result.profile.regionId, 'neutral_france');
  assert.equal(result.profile.assistantName, 'EMOPET');
  assert.equal(result.isDefault, true);
});

test('unsupported department never inherits Bretagne by default', () => {
  const result = detectRegion({ department: '75' });

  assert.equal(result.profile.regionId, 'neutral_france');
  assert.equal(result.profile.assistantName, 'EMOPET');
  assert.equal(result.isDefault, true);
});

test('unknown declared region never inherits Bretagne by default', () => {
  const result = detectRegion({ declaredRegionId: 'normandie' });

  assert.equal(result.profile.regionId, 'neutral_france');
  assert.equal(result.profile.assistantName, 'EMOPET');
});

test('known Bretagne departments keep the controlled Bretagne mapping', () => {
  for (const department of ['29', '44']) {
    const result = detectRegion({ department });
    assert.equal(result.profile.regionId, 'bretagne', department);
    assert.equal(result.isDefault, false, department);
  }
});

test('supported current territory wins over home-region fallback', () => {
  const result = resolveRegionalCompanionContext({
    homeRegionId: 'bretagne',
    currentDepartment: '29',
  });

  assert.equal(result.mode, 'CURRENT_REGION');
  assert.equal(result.active.profile.regionId, 'bretagne');
  assert.equal(result.homeRegionId, 'bretagne');
  assert.equal(result.currentRegionId, 'bretagne');
  assert.equal(result.isAwayFromHome, false);
});

test('explicit unsupported current territory neutralises the active companion', () => {
  const result = resolveRegionalCompanionContext({
    homeRegionId: 'bretagne',
    currentDepartment: '75',
  });

  assert.equal(result.mode, 'CURRENT_REGION_UNSUPPORTED_NEUTRAL');
  assert.equal(result.active.profile.regionId, 'neutral_france');
  assert.equal(result.active.profile.assistantName, 'EMOPET');
  assert.equal(result.homeRegionId, 'bretagne');
  assert.equal(result.currentContextProvided, true);
  assert.equal(result.isAwayFromHome, true);
});

test('home region stays active when no current-territory context is supplied', () => {
  const result = resolveRegionalCompanionContext({
    homeRegionId: 'bretagne',
  });

  assert.equal(result.mode, 'HOME_REGION');
  assert.equal(result.active.profile.regionId, 'bretagne');
  assert.equal(result.currentContextProvided, false);
  assert.equal(result.isAwayFromHome, false);
});

test('resolver acquires no precise location and stores no coordinate fields', () => {
  const result = resolveRegionalCompanionContext({
    homeRegionId: 'bretagne',
    currentRegionId: 'normandie',
  });

  const serialized = JSON.stringify(result).toLowerCase();
  assert.doesNotMatch(serialized, /latitude|longitude|coordinate|gps/);
  assert.equal(result.active.profile.regionId, 'neutral_france');
});
