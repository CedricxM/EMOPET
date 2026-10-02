/**
 * World preview authority tests.
 *
 * The web prototype may stay interactive, but it must not invent a second
 * progression economy or reward Care / MAT / TAG / ELI / dog-performance data.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  EMPTY_RESOURCE_BALANCE,
  MOCK_WORLD_EVENTS,
  PREVIEW_RESOURCE_BALANCE,
  WORLD_BUILD_ITEMS,
  WORLD_PREVIEW_AUTHORITY,
  WORLD_QUESTS,
  WORLD_RESOURCES,
  addResources,
  canAfford,
  computeResourceBalance,
  getResourceDefinition,
  spendResources,
} from '../mock-world';
import type { ResourceBalance, WorldResourceKey } from '../mock-world';

const authority = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-progression-authority-v1.json', import.meta.url),
    'utf8',
  ),
);
const quests = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-quest-catalog-v1.json', import.meta.url),
    'utf8',
  ),
);
const regional = JSON.parse(
  readFileSync(
    new URL('../../../../config/world/world-regional-collections-v1.json', import.meta.url),
    'utf8',
  ),
);
const source = readFileSync(new URL('../mock-world.ts', import.meta.url), 'utf8');

test('preview is explicitly non-authoritative account state', () => {
  assert.equal(WORLD_PREVIEW_AUTHORITY, 'LOCAL_VISUAL_PREVIEW_NOT_ACCOUNT_PROGRESSION');
  assert.equal(authority.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
});

test('web preview resources exactly match canonical G1 resources', () => {
  assert.deepEqual(
    WORLD_RESOURCES.map((resource) => resource.key),
    authority.resources,
  );
  assert.deepEqual(Object.keys(EMPTY_RESOURCE_BALANCE), authority.resources);
  assert.deepEqual(Object.keys(PREVIEW_RESOURCE_BALANCE), authority.resources);
});

test('preview reward examples exactly match server-owned G1 reward amounts', () => {
  assert.deepEqual(
    MOCK_WORLD_EVENTS.map((event) => event.type).sort(),
    Object.keys(authority.rewards).sort(),
  );

  for (const event of MOCK_WORLD_EVENTS) {
    assert.equal(event.previewOnly, true);
    assert.deepEqual(event.grants, authority.rewards[event.type]);
  }
});

test('quest preview mirrors the canonical G1 quest catalogue with zero account progress', () => {
  assert.deepEqual(
    WORLD_QUESTS.map(({ id, title, target }) => ({ id, title, target })),
    quests.quests.map((quest: { id: string; title: string; targetDistinctSources: number }) => ({
      id: quest.id,
      title: quest.title,
      target: quest.targetDistinctSources,
    })),
  );

  for (const quest of WORLD_QUESTS) {
    assert.equal(quest.previewOnly, true);
    assert.equal(quest.progress, 0);
  }
});

test('Bretagne build preview mirrors canonical regional ids, titles and costs', () => {
  const breiz = regional.collections.find(
    (collection: { regionCode: string }) => collection.regionCode === 'FR-BRE',
  );
  assert.ok(breiz);

  assert.deepEqual(
    WORLD_BUILD_ITEMS.map(({ id, title, cost }) => ({ id, title, cost })),
    breiz.items.map((item: { id: string; title: string; cost: Partial<ResourceBalance> }) => ({
      id: item.id,
      title: item.title,
      cost: item.cost,
    })),
  );
});

test('preview resource arithmetic remains pure and bounded', () => {
  const base: ResourceBalance = { ...EMPTY_RESOURCE_BALANCE, knowledgeFragments: 3 };
  const next = addResources(base, { knowledgeFragments: 1, localDiscoveries: 2 });
  assert.equal(next.knowledgeFragments, 4);
  assert.equal(next.localDiscoveries, 2);
  assert.equal(base.knowledgeFragments, 3, 'input was mutated');

  const computed = computeResourceBalance();
  assert.equal(computed.knowledgeFragments, 1);
  assert.equal(computed.localDiscoveries, 3);
  assert.equal(computed.walkTraces, 2);
  assert.equal(computed.communitySeeds, 3);
  assert.equal(computed.memoryThreads, 2);
});

test('preview affordability simulation never creates negative values', () => {
  assert.equal(
    canAfford(PREVIEW_RESOURCE_BALANCE, {
      localDiscoveries: 5,
      communitySeeds: 3,
    }),
    true,
  );

  const after = spendResources(PREVIEW_RESOURCE_BALANCE, {
    localDiscoveries: 5,
    communitySeeds: 3,
  });
  assert.equal(after.localDiscoveries, 3);
  assert.equal(after.communitySeeds, 3);

  const clamped = spendResources(EMPTY_RESOURCE_BALANCE, { knowledgeFragments: 50 });
  assert.equal(clamped.knowledgeFragments, 0);
});

test('every cost and grant references only canonical resource keys', () => {
  const keys = new Set<WorldResourceKey>(authority.resources);

  for (const item of WORLD_BUILD_ITEMS) {
    for (const key of Object.keys(item.cost) as WorldResourceKey[]) {
      assert.equal(keys.has(key), true, `${item.id} references unknown resource ${key}`);
    }
  }

  for (const event of MOCK_WORLD_EVENTS) {
    for (const key of Object.keys(event.grants) as WorldResourceKey[]) {
      assert.equal(keys.has(key), true, `${event.id} references unknown resource ${key}`);
    }
  }
});

test('legacy Care/sensor/bond economy terms cannot return to the preview', () => {
  for (const forbidden of [
    'routinePoints',
    'observationQuality',
    'trustFragments',
    'calmStones',
    'bondMoments',
    'signalClarity',
    'reliable_rest_window_completed',
    'signal_quality_high',
    'mat_setup_completed',
  ]) {
    assert.equal(source.includes(forbidden), false, `legacy World economy term returned: ${forbidden}`);
  }

  assert.doesNotMatch(
    source,
    /MAT captured|TAG and MAT|signal confidence|Care routines completed|bond score|dog performance/i,
  );
});

test('resource descriptions preserve the forbidden-source boundary', () => {
  const forbidden = [
    'emotion',
    'wellbeing',
    'well-being',
    'sleep score',
    'health score',
    'relationship score',
    'signal confidence',
    'sensor reward',
  ];

  for (const resource of WORLD_RESOURCES) {
    const text = `${resource.label} ${resource.description}`.toLowerCase();
    for (const term of forbidden) {
      assert.equal(text.includes(term), false, `${resource.key} contains forbidden reward semantics: ${term}`);
    }
  }
});

test('resource lookup follows canonical keys', () => {
  assert.equal(getResourceDefinition('knowledgeFragments').label, 'Knowledge Fragments');
  assert.throws(() => getResourceDefinition('nope' as WorldResourceKey));
});
