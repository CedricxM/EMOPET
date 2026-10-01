import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  // Type-only imports disappear. Runtime relative imports are rewritten below
  // to data URLs for the two small World economy modules under test.
  return { source, transpiled };
}

async function loadBuildModule() {
  const regional = await loadModule('../api/services/world-regional-collections.ts');
  const regionalUrl = `data:text/javascript;base64,${Buffer.from(regional.transpiled).toString('base64')}`;

  const build = await loadModule('../api/services/world-build-economy.ts');
  const rewritten = build.transpiled.replace(
    /from ['"]\.\/world-regional-collections['"]/,
    `from '${regionalUrl}'`,
  );

  return import(`data:text/javascript;base64,${Buffer.from(rewritten).toString('base64')}`);
}

async function loadCatalog() {
  return JSON.parse(
    await readFile(
      new URL('../../config/world/world-regional-collections-v1.json', import.meta.url),
      'utf8',
    ),
  );
}

function balance(overrides = {}) {
  return {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
    ...overrides,
  };
}

test('build projection spends resources and owns the regional item once', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');

  const result = mod.planWorldBuild({
    balance: balance({ localDiscoveries: 5, communitySeeds: 3 }),
    ownedItemIds: [],
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.equal(result.decision, 'built');
  assert.deepEqual(result.balance, balance());
  assert.deepEqual(result.ownedItemIds, ['breiz-mini-lighthouse']);
});

test('already-owned build is idempotent and spends nothing', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');
  const before = balance({ localDiscoveries: 9, communitySeeds: 7 });

  const result = mod.planWorldBuild({
    balance: before,
    ownedItemIds: ['breiz-mini-lighthouse', 'breiz-mini-lighthouse'],
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.equal(result.decision, 'already_owned');
  assert.deepEqual(result.balance, before);
  assert.deepEqual(result.ownedItemIds, ['breiz-mini-lighthouse']);
});

test('insufficient resources fail closed without partial spend', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');
  const before = balance({ localDiscoveries: 5, communitySeeds: 2 });

  const result = mod.planWorldBuild({
    balance: before,
    ownedItemIds: [],
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.equal(result.decision, 'insufficient_resources');
  assert.deepEqual(result.balance, before);
  assert.deepEqual(result.ownedItemIds, []);
});

test('item from another collection cannot be built through the selected collection', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const global = cfg.collections.find((collection) => collection.regionCode === 'GLOBAL');

  const result = mod.planWorldBuild({
    balance: balance({
      knowledgeFragments: 99,
      localDiscoveries: 99,
      walkTraces: 99,
      communitySeeds: 99,
      memoryThreads: 99,
    }),
    ownedItemIds: [],
    collection: global,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.equal(result.decision, 'unknown_item');
  assert.deepEqual(result.ownedItemIds, []);
});

test('build projection never mutates caller-owned state', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');
  const beforeBalance = balance({ localDiscoveries: 5, communitySeeds: 3 });
  const beforeOwned = [];

  mod.planWorldBuild({
    balance: beforeBalance,
    ownedItemIds: beforeOwned,
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.deepEqual(beforeBalance, balance({ localDiscoveries: 5, communitySeeds: 3 }));
  assert.deepEqual(beforeOwned, []);
});
