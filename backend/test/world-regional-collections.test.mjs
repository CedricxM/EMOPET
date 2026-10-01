import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadRegionalModule() {
  const source = await readFile(
    new URL('../api/services/world-regional-collections.ts', import.meta.url),
    'utf8',
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return {
    source,
    module: await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`),
  };
}

async function loadCatalog() {
  return JSON.parse(
    await readFile(
      new URL('../../config/world/world-regional-collections-v1.json', import.meta.url),
      'utf8',
    ),
  );
}

const EMPTY_BALANCE = {
  knowledgeFragments: 0,
  localDiscoveries: 0,
  walkTraces: 0,
  communitySeeds: 0,
  memoryThreads: 0,
};

test('regional catalogue is coarse, explicit and grants no location reward', async () => {
  const cfg = await loadCatalog();

  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(cfg.selectionAuthority, 'explicit-coarse-region-code');
  assert.equal(cfg.exactLocationAccepted, false);
  assert.equal(cfg.automaticLocationReward, false);
  assert.ok(cfg.collections.some((collection) => collection.regionCode === 'GLOBAL'));
  assert.ok(cfg.collections.some((collection) => collection.regionCode === 'FR-BRE'));
});

test('Brittany resolves to Breiz while unknown or precise-looking input falls back globally', async () => {
  const { module: mod } = await loadRegionalModule();
  const cfg = await loadCatalog();

  assert.equal(mod.resolveWorldRegionalCollection(cfg, 'fr-bre').identity.name, 'Breiz');
  assert.equal(mod.resolveWorldRegionalCollection(cfg, 'FR-IDF').regionCode, 'GLOBAL');
  assert.equal(mod.resolveWorldRegionalCollection(cfg, null).regionCode, 'GLOBAL');
  assert.equal(
    mod.resolveWorldRegionalCollection(cfg, '48.8566,2.3522').regionCode,
    'GLOBAL',
  );
  assert.equal(
    mod.resolveWorldRegionalCollection(cfg, '10 rue de quelque part').regionCode,
    'GLOBAL',
  );
});

test('regional item costs use only authorised World resources and positive bounded amounts', async () => {
  const cfg = await loadCatalog();
  const progression = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const allowedResources = new Set(progression.resources);

  for (const collection of cfg.collections) {
    for (const item of collection.items) {
      const costs = Object.entries(item.cost);
      assert.ok(costs.length > 0, `${item.id} must have a cost`);
      for (const [resource, amount] of costs) {
        assert.equal(allowedResources.has(resource), true, `${item.id} uses unknown resource ${resource}`);
        assert.equal(Number.isInteger(amount), true);
        assert.equal(amount > 0 && amount <= 20, true, `${item.id} cost must stay bounded`);
      }
    }
  }
});

test('regional purchase spends earned resources and never creates value', async () => {
  const { module: mod } = await loadRegionalModule();
  const cfg = await loadCatalog();
  const breiz = mod.resolveWorldRegionalCollection(cfg, 'FR-BRE');
  const lighthouse = breiz.items.find((item) => item.id === 'breiz-mini-lighthouse');
  assert.ok(lighthouse);

  const funded = {
    ...EMPTY_BALANCE,
    localDiscoveries: 5,
    communitySeeds: 3,
  };

  assert.equal(mod.canAffordWorldRegionalItem(funded, lighthouse), true);
  assert.deepEqual(
    mod.spendWorldRegionalItemCost(funded, lighthouse),
    { ...EMPTY_BALANCE },
  );
  assert.deepEqual(funded, {
    ...EMPTY_BALANCE,
    localDiscoveries: 5,
    communitySeeds: 3,
  });
});

test('regional boundary does not accept coordinates, address, geofence or passive history fields', async () => {
  const { source } = await loadRegionalModule();
  const signature = source.match(
    /export function resolveWorldRegionalCollection\(([\s\S]*?)\): WorldRegionalCollection/,
  );
  assert.ok(signature);

  assert.doesNotMatch(signature[1], /lat|lng|longitude|latitude|address|geofence|distance|history/i);
  assert.match(source, /explicit coarse region code/i);
  assert.match(source, /No coordinates, address, distance, geofence, passive history or dog telemetry/);
});


test('regional catalogue has unique region codes and globally unique item ids', async () => {
  const cfg = await loadCatalog();
  const regionCodes = cfg.collections.map((collection) => collection.regionCode);
  assert.equal(new Set(regionCodes).size, regionCodes.length);
  assert.equal(regionCodes.filter((code) => code === 'GLOBAL').length, 1);

  const itemIds = cfg.collections.flatMap((collection) =>
    collection.items.map((item) => item.id),
  );
  assert.equal(new Set(itemIds).size, itemIds.length);
});
