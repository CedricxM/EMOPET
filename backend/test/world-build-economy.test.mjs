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
    /from ['"]\.\/world-regional-collections(?:\.js)?['"]/,
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

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_OWNER_ID = '22222222-2222-4222-8222-222222222222';

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

function ownerBalance(overrides = {}, ownerId = OWNER_ID) {
  return { ownerId, balance: balance(overrides) };
}

function ownedItem(itemId, ownerId = OWNER_ID) {
  return { ownerId, itemId };
}

test('build projection spends resources and owns the regional item once', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');

  const result = mod.planWorldBuild({
    ownerId: OWNER_ID,
    ownerBalance: ownerBalance({ localDiscoveries: 5, communitySeeds: 3 }),
    ownedItems: [],
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
    ownerId: OWNER_ID,
    ownerBalance: { ownerId: OWNER_ID, balance: before },
    ownedItems: [ownedItem('breiz-mini-lighthouse')],
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.equal(result.decision, 'already_owned');
  assert.deepEqual(result.balance, before);
  assert.deepEqual(result.ownedItemIds, ['breiz-mini-lighthouse']);
});

test('build rejects resource state belonging to another Owner', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');

  assert.throws(
    () => mod.planWorldBuild({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance({ localDiscoveries: 99 }, OTHER_OWNER_ID),
      ownedItems: [],
      collection: breiz,
      itemId: 'breiz-mini-lighthouse',
    }),
    /WORLD_BUILD_BALANCE_OWNER_SCOPE_MISMATCH/,
  );
});

test('build rejects ownership rows belonging to another Owner', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');

  assert.throws(
    () => mod.planWorldBuild({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance({ localDiscoveries: 99, communitySeeds: 99 }),
      ownedItems: [ownedItem('memory-lantern', OTHER_OWNER_ID)],
      collection: breiz,
      itemId: 'breiz-mini-lighthouse',
    }),
    /WORLD_BUILD_OWNED_ITEM_OWNER_SCOPE_MISMATCH/,
  );
});

test('build rejects duplicate ownership rows instead of normalizing corruption', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');

  assert.throws(
    () => mod.planWorldBuild({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance({ localDiscoveries: 99, communitySeeds: 99 }),
      ownedItems: [
        ownedItem('breiz-mini-lighthouse'),
        ownedItem('breiz-mini-lighthouse'),
      ],
      collection: breiz,
      itemId: 'breiz-mini-lighthouse',
    }),
    /WORLD_BUILD_DUPLICATE_OWNED_ITEM/,
  );
});

test('insufficient resources fail closed without partial spend', async () => {
  const mod = await loadBuildModule();
  const cfg = await loadCatalog();
  const breiz = cfg.collections.find((collection) => collection.regionCode === 'FR-BRE');
  const before = balance({ localDiscoveries: 5, communitySeeds: 2 });

  const result = mod.planWorldBuild({
    ownerId: OWNER_ID,
    ownerBalance: { ownerId: OWNER_ID, balance: before },
    ownedItems: [],
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
    ownerId: OWNER_ID,
    ownerBalance: ownerBalance({
      knowledgeFragments: 99,
      localDiscoveries: 99,
      walkTraces: 99,
      communitySeeds: 99,
      memoryThreads: 99,
    }),
    ownedItems: [],
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
    ownerId: OWNER_ID,
    ownerBalance: { ownerId: OWNER_ID, balance: beforeBalance },
    ownedItems: beforeOwned,
    collection: breiz,
    itemId: 'breiz-mini-lighthouse',
  });

  assert.deepEqual(beforeBalance, balance({ localDiscoveries: 5, communitySeeds: 3 }));
  assert.deepEqual(beforeOwned, []);
});
