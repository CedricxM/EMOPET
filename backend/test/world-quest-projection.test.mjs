import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadQuestModule() {
  const source = await readFile(
    new URL('../api/services/world-quest-projection.ts', import.meta.url),
    'utf8',
  );
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);
}

function entry(overrides) {
  return {
    id: 'entry',
    ownerId: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'idempotency:001',
    kind: 'knowledge.card_read',
    sourceRef: 'knowledge:one',
    grants: { knowledgeFragments: 1 },
    recordedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

test('quest projection counts distinct authorised sources instead of ledger row volume', async () => {
  const mod = await loadQuestModule();
  const progress = mod.projectWorldQuestProgress([
    entry({ id: '1', sourceRef: 'knowledge:one' }),
    entry({ id: '2', sourceRef: 'knowledge:one', idempotencyKey: 'idempotency:002' }),
    entry({ id: '3', sourceRef: 'knowledge:two', idempotencyKey: 'idempotency:003' }),
    entry({ id: '4', sourceRef: 'knowledge:three', idempotencyKey: 'idempotency:004' }),
  ]);

  const quest = progress.find((item) => item.id === 'learn-three');
  assert.ok(quest);
  assert.equal(quest.current, 3);
  assert.equal(quest.target, 3);
  assert.equal(quest.completed, true);
});

test('quest projection keeps unrelated event kinds isolated', async () => {
  const mod = await loadQuestModule();
  const progress = mod.projectWorldQuestProgress([
    entry({
      id: '1',
      kind: 'local.place_saved',
      sourceRef: 'place:one',
      grants: { localDiscoveries: 2 },
    }),
    entry({
      id: '2',
      kind: 'local.route_saved',
      sourceRef: 'route:one',
      grants: { walkTraces: 2, localDiscoveries: 1 },
      idempotencyKey: 'idempotency:002',
    }),
  ]);

  const placeQuest = progress.find((item) => item.id === 'local-scout-three');
  const routeQuest = progress.find((item) => item.id === 'route-cartographer-two');
  assert.equal(placeQuest.current, 1);
  assert.equal(routeQuest.current, 1);
  assert.equal(placeQuest.completed, false);
  assert.equal(routeQuest.completed, false);
});

test('quest progress caps at target and never creates bonus rewards in G1C', async () => {
  const mod = await loadQuestModule();
  const entries = Array.from({ length: 8 }, (_, index) =>
    entry({
      id: String(index),
      idempotencyKey: `knowledge:key:${index}`,
      sourceRef: `knowledge:card:${index}`,
    }),
  );
  const progress = mod.projectWorldQuestProgress(entries);
  const quest = progress.find((item) => item.id === 'learn-three');

  assert.equal(quest.current, 3);
  assert.equal(quest.completed, true);
  assert.equal('reward' in quest, false);
  assert.equal('grants' in quest, false);
  assert.equal('xp' in quest, false);
});

test('checked-in quest config and server quest catalogue stay aligned', async () => {
  const mod = await loadQuestModule();
  const cfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-quest-catalog-v1.json', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(cfg.progressSource, 'world-progression-ledger');
  assert.equal(cfg.completionRewards, 'NONE_IN_G1C');
  assert.equal(cfg.antiFarming.countDistinctSourceRefs, true);
  assert.equal(cfg.antiFarming.countLedgerDuplicates, false);
  assert.equal(cfg.antiFarming.dogActivity, false);
  assert.equal(cfg.antiFarming.careOrEliSignals, false);

  const fromConfig = cfg.quests.map((quest) => ({
    id: quest.id,
    title: quest.title,
    eventKind: quest.eventKind,
    targetDistinctSources: quest.targetDistinctSources,
    category: quest.category,
  }));

  assert.deepEqual(mod.WORLD_QUEST_CATALOG, fromConfig);
});


test('every quest event kind is already authorised by the World progression authority', async () => {
  const questCfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-quest-catalog-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const progressionCfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );

  const allowed = new Set(Object.keys(progressionCfg.rewards));
  for (const quest of questCfg.quests) {
    assert.equal(allowed.has(quest.eventKind), true, `quest ${quest.id} uses unauthorised event ${quest.eventKind}`);
    assert.equal(
      progressionCfg.forbiddenEventPrefixes.some((prefix) => quest.eventKind.startsWith(prefix)),
      false,
      `quest ${quest.id} overlaps forbidden progression prefix`,
    );
  }
});
