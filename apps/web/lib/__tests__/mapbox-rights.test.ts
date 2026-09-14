import test from 'node:test';
import assert from 'node:assert/strict';

import { getControlledMapboxToken } from '../mapbox-rights';

test('DATA-LIC-G5: Mapbox activation requires a public token and exact GO gate', () => {
  assert.equal(getControlledMapboxToken(undefined, undefined), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', undefined), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', '1'), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'go'), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'true'), null);
  assert.equal(getControlledMapboxToken('', 'GO'), null);
  assert.equal(getControlledMapboxToken('   ', 'GO'), null);
  assert.equal(getControlledMapboxToken('public-test-token', 'GO'), null);
  assert.equal(getControlledMapboxToken('sk.secret-test-token', 'GO'), null);
  assert.equal(getControlledMapboxToken('pk.public-test-token', 'GO'), 'pk.public-test-token');
});

test('DATA-LIC-G5: Mapbox token normalization does not weaken the rights gate or public-token boundary', () => {
  assert.equal(getControlledMapboxToken('  pk.public-test-token  ', 'GO'), 'pk.public-test-token');
  assert.equal(getControlledMapboxToken('  sk.secret-test-token  ', 'GO'), null);
  assert.equal(getControlledMapboxToken('  pk.public-test-token  ', ' GO '), null);
});
