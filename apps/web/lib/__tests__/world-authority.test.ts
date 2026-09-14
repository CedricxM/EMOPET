import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MOCK_WORLD_EVENTS,
  WORLD_BUILD_ITEMS,
  WORLD_QUESTS,
  WORLD_RESOURCES,
  type WorldResourceKey,
} from '../mock-world';

const SAFE_RESOURCE_KEYS = new Set<WorldResourceKey>([
  'driftwood',
  'seaGlass',
  'gardenSeeds',
  'lanternLight',
  'mapInk',
  'storyThreads',
]);

const FORBIDDEN_WORLD_SOURCE_TERMS = /(^|_)(mat|tag|eli|rest|sleep|walk|distance|signal|observation|health|wellbeing|bond)(_|$)/i;

test('World resources are World-owned and exclude former Care-derived currencies', () => {
  const keys = WORLD_RESOURCES.map((resource) => resource.key);
  assert.deepEqual(new Set(keys), SAFE_RESOURCE_KEYS);

  for (const key of keys) {
    assert.ok(!FORBIDDEN_WORLD_SOURCE_TERMS.test(key), `forbidden World resource key: ${key}`);
  }
});

test('World grant events are generated only by World event types', () => {
  for (const event of MOCK_WORLD_EVENTS) {
    assert.ok(event.type.startsWith('world_'), `non-World event type: ${event.type}`);
    assert.ok(!FORBIDDEN_WORLD_SOURCE_TERMS.test(event.type), `Care/dog-performance source leaked into World event: ${event.type}`);

    for (const key of Object.keys(event.grants) as WorldResourceKey[]) {
      assert.ok(SAFE_RESOURCE_KEYS.has(key), `unknown or unauthorized World grant key: ${key}`);
    }
  }
});

test('World quests and build costs use only World-owned resource keys', () => {
  for (const quest of WORLD_QUESTS) {
    assert.ok(SAFE_RESOURCE_KEYS.has(quest.resourceHint), `unauthorized quest resource: ${quest.resourceHint}`);
  }

  for (const item of WORLD_BUILD_ITEMS) {
    for (const key of Object.keys(item.cost) as WorldResourceKey[]) {
      assert.ok(SAFE_RESOURCE_KEYS.has(key), `unauthorized build cost ${key} on ${item.id}`);
    }
  }
});
