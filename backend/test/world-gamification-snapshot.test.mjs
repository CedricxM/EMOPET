import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function transpile(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return {
    source,
    output: ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  };
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

async function loadSnapshotModule() {
  const regional = await transpile('../api/services/world-regional-collections.ts');
  const quest = await transpile('../api/services/world-quest-projection.ts');
  const provenance = await transpile('../api/services/world-progression-provenance.ts');
  const snapshot = await transpile('../api/services/world-gamification-snapshot.ts');

  const regionalUrl = dataUrl(regional.output);
  const questUrl = dataUrl(quest.output);
  const provenanceUrl = dataUrl(provenance.output);
  const rewritten = snapshot.output
    .replace(/from ['"]\.\/world-quest-projection(?:\.js)?['"]/, `from '${questUrl}'`)
    .replace(/from ['"]\.\/world-progression-provenance(?:\.js)?['"]/, `from '${provenanceUrl}'`)
    .replace(/from ['"]\.\/world-regional-collections(?:\.js)?['"]/, `from '${regionalUrl}'`);

  return {
    source: snapshot.source,
    module: await import(dataUrl(rewritten)),
  };
}

async function loadRegionalCatalog() {
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

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_OWNER_ID = '22222222-2222-4222-8222-222222222222';

function ownerBalance(overrides = {}, ownerId = OWNER_ID) {
  return {
    ownerId,
    balance: balance(overrides),
  };
}

function ownedItem(itemId, ownerId = OWNER_ID) {
  return { ownerId, itemId };
}

function ledgerEntry(overrides = {}) {
  return {
    id: 'entry-1',
    ownerId: OWNER_ID,
    idempotencyKey: 'knowledge:key:001',
    kind: 'knowledge.card_read',
    sourceRef: 'knowledge:card:one',
    grants: { knowledgeFragments: 1 },
    recordedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

test('snapshot composes Breiz identity, safe resources, quests, provenance and collection availability', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  const snapshot = mod.buildWorldGamificationSnapshot({
    ownerId: OWNER_ID,
    ownerBalance: ownerBalance({
      knowledgeFragments: 7,
      localDiscoveries: 5,
      communitySeeds: 3,
    }),
    ledgerEntries: [
      ledgerEntry({ sourceRef: 'knowledge:card:one' }),
      ledgerEntry({
        id: 'entry-2',
        idempotencyKey: 'knowledge:key:002',
        sourceRef: 'knowledge:card:two',
      }),
    ],
    ownedItems: [ownedItem('breiz-learning-sail')],
    regionalCatalog,
    regionCode: 'FR-BRE',
  });

  assert.equal(snapshot.authority, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.deepEqual(snapshot.region, {
    code: 'FR-BRE',
    identityName: 'Breiz',
    themeId: 'world-bretagne',
  });

  const learningQuest = snapshot.quests.find((quest) => quest.id === 'learn-three');
  assert.equal(learningQuest.current, 2);
  assert.equal(learningQuest.completed, false);

  assert.equal(snapshot.provenance.ownerId, OWNER_ID);
  assert.deepEqual(snapshot.provenance.grossEarned, {
    knowledgeFragments: 2,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  });
  assert.deepEqual(
    snapshot.provenance.items.map((item) => item.reasonCode),
    ['knowledge_read', 'knowledge_read'],
  );

  const lighthouse = snapshot.collectionItems.find((item) => item.id === 'breiz-mini-lighthouse');
  const sail = snapshot.collectionItems.find((item) => item.id === 'breiz-learning-sail');
  assert.equal(lighthouse.affordable, true);
  assert.equal(lighthouse.owned, false);
  assert.equal(sail.owned, true);
  assert.equal(sail.affordable, false);
});

test('snapshot falls back to GLOBAL with Owner-scoped inventory', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  const snapshot = mod.buildWorldGamificationSnapshot({
    ownerId: OWNER_ID,
    ownerBalance: ownerBalance(),
    ledgerEntries: [],
    ownedItems: [ownedItem('memory-lantern')],
    regionalCatalog,
    regionCode: 'not-a-region',
  });

  assert.equal(snapshot.region.code, 'GLOBAL');
  assert.equal(snapshot.region.identityName, 'EMOPET World');
  assert.deepEqual(snapshot.ownedItemIds, ['memory-lantern']);
});

test('snapshot rejects ledger rows from another Owner', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  assert.throws(
    () => mod.buildWorldGamificationSnapshot({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance(),
      ledgerEntries: [
        ledgerEntry({
          ownerId: OTHER_OWNER_ID,
          sourceRef: 'knowledge:foreign',
        }),
      ],
      ownedItems: [],
      regionalCatalog,
      regionCode: 'GLOBAL',
    }),
    /WORLD_QUEST_OWNER_SCOPE_MISMATCH/,
  );
});

test('snapshot rejects a balance belonging to another Owner', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  assert.throws(
    () => mod.buildWorldGamificationSnapshot({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance({}, OTHER_OWNER_ID),
      ledgerEntries: [],
      ownedItems: [],
      regionalCatalog,
      regionCode: 'GLOBAL',
    }),
    /BALANCE_OWNER_SCOPE_MISMATCH/,
  );
});

test('snapshot rejects inventory rows belonging to another Owner', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  assert.throws(
    () => mod.buildWorldGamificationSnapshot({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance(),
      ledgerEntries: [],
      ownedItems: [ownedItem('memory-lantern', OTHER_OWNER_ID)],
      regionalCatalog,
      regionCode: 'GLOBAL',
    }),
    /OWNED_ITEM_OWNER_SCOPE_MISMATCH/,
  );
});

test('snapshot rejects duplicate ownership rows instead of hiding persistence corruption', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();

  assert.throws(
    () => mod.buildWorldGamificationSnapshot({
      ownerId: OWNER_ID,
      ownerBalance: ownerBalance(),
      ledgerEntries: [],
      ownedItems: [
        ownedItem('memory-lantern'),
        ownedItem('memory-lantern'),
      ],
      regionalCatalog,
      regionCode: 'GLOBAL',
    }),
    /DUPLICATE_OWNED_ITEM/,
  );
});

test('snapshot contract excludes ranking, XP, streak and dog/Care scoring surfaces', async () => {
  const { source, module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();
  const snapshot = mod.buildWorldGamificationSnapshot({
    ownerId: OWNER_ID,
    ownerBalance: ownerBalance(),
    ledgerEntries: [],
    ownedItems: [],
    regionalCatalog,
    regionCode: 'GLOBAL',
  });

  const json = JSON.stringify(snapshot).toLowerCase();
  for (const forbidden of [
    '"xp"',
    '"level"',
    '"rank"',
    '"streak"',
    '"dogscore"',
    '"healthscore"',
    '"relationshipscore"',
    '"eli"',
    '"latitude"',
    '"longitude"',
  ]) {
    assert.equal(json.includes(forbidden), false, `snapshot leaked forbidden field ${forbidden}`);
  }

  assert.match(source, /Deliberately absent: XP, level, rank, streak, dog score/);
});

test('snapshot copies caller balance instead of exposing mutable state', async () => {
  const { module: mod } = await loadSnapshotModule();
  const regionalCatalog = await loadRegionalCatalog();
  const original = ownerBalance({ localDiscoveries: 9 });

  const snapshot = mod.buildWorldGamificationSnapshot({
    ownerId: OWNER_ID,
    ownerBalance: original,
    ledgerEntries: [],
    ownedItems: [],
    regionalCatalog,
    regionCode: 'GLOBAL',
  });

  snapshot.resources.localDiscoveries = 0;
  assert.equal(original.balance.localDiscoveries, 9);
});
