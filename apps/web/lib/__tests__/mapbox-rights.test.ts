import test from 'node:test';
import assert from 'node:assert/strict';

import { getControlledMapboxToken } from '../mapbox-rights';

test('DATA-LIC-G5: Mapbox activation requires both a non-empty token and exact GO gate', () => {
  assert.equal(getControlledMapboxToken(undefined, undefined), null);
  assert.equal(getControlledMapboxToken('public-test-token', undefined), null);
  assert.equal(getControlledMapboxToken('public-test-token', '1'), null);
  assert.equal(getControlledMapboxToken('public-test-token', 'go'), null);
  assert.equal(getControlledMapboxToken('public-test-token', 'true'), null);
  assert.equal(getControlledMapboxToken('', 'GO'), null);
  assert.equal(getControlledMapboxToken('   ', 'GO'), null);
  assert.equal(getControlledMapboxToken('public-test-token', 'GO'), 'public-test-token');
});

test('DATA-LIC-G5: Mapbox token normalization does not weaken the rights gate', () => {
  assert.equal(getControlledMapboxToken('  public-test-token  ', 'GO'), 'public-test-token');
  assert.equal(getControlledMapboxToken('  public-test-token  ', ' GO '), null);
});
