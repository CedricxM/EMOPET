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

async function loadTransitionModule() {
  const regional = await transpile('../api/services/world-regional-collections.ts');
  const transition = await transpile('../api/services/world-region-transition.ts');
  const regionalUrl = dataUrl(regional.output);
  const rewritten = transition.output.replace(
    /from ['"]\.\/world-regional-collections['"]/,
    `from '${regionalUrl}'`,
  );

  return {
    source: transition.source,
    module: await import(dataUrl(rewritten)),
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

test('switching from Breiz to GLOBAL retains regional ownership without auto-placement', async () => {
  const { module: mod } = await loadTransitionModule();
  const catalog = await loadCatalog();

  const plan = mod.planWorldRegionTransition({
    catalog,
    currentRegionCode: 'FR-BRE',
    nextRegionCode: 'GLOBAL',
    ownedItemIds: ['breiz-mini-lighthouse', 'memory-lantern'],
  });

  assert.equal(plan.fromRegionCode, 'FR-BRE');
  assert.equal(plan.toRegionCode, 'GLOBAL');
  assert.equal(plan.fromIdentityName, 'Breiz');
  assert.equal(plan.toIdentityName, 'EMOPET World');
  assert.deepEqual(
    plan.retainedOwnedItemIds,
    ['breiz-mini-lighthouse', 'memory-lantern'],
  );
  assert.deepEqual(plan.ownedOutsideActiveCollectionIds, ['breiz-mini-lighthouse']);
  assert.equal(plan.activeCollectionItemIds.includes('memory-lantern'), true);
});

test('switching region never creates resources or reward fields', async () => {
  const { module: mod } = await loadTransitionModule();
  const catalog = await loadCatalog();

  const plan = mod.planWorldRegionTransition({
    catalog,
    currentRegionCode: 'GLOBAL',
    nextRegionCode: 'FR-BRE',
    ownedItemIds: [],
  });
  const json = JSON.stringify(plan).toLowerCase();

  for (const forbidden of ['reward', 'grant', 'resource', 'points', 'xp']) {
    assert.equal(json.includes(forbidden), false, `transition leaked ${forbidden}`);
  }
});

test('precise-looking or unknown next-region input falls back to GLOBAL', async () => {
  const { module: mod } = await loadTransitionModule();
  const catalog = await loadCatalog();

  for (const nextRegionCode of ['48.8566,2.3522', '10 rue de test', 'FR-IDF']) {
    const plan = mod.planWorldRegionTransition({
      catalog,
      currentRegionCode: 'FR-BRE',
      nextRegionCode,
      ownedItemIds: [],
    });
    assert.equal(plan.toRegionCode, 'GLOBAL');
  }
});

test('duplicate owned items fail closed instead of being silently normalized', async () => {
  const { module: mod } = await loadTransitionModule();
  const catalog = await loadCatalog();

  assert.throws(
    () => mod.planWorldRegionTransition({
      catalog,
      currentRegionCode: 'FR-BRE',
      nextRegionCode: 'GLOBAL',
      ownedItemIds: ['breiz-mini-lighthouse', 'breiz-mini-lighthouse'],
    }),
    /DUPLICATE_OWNED_ITEM/,
  );
});

test('unknown or retired owned item ids remain retained across transition', async () => {
  const { module: mod } = await loadTransitionModule();
  const catalog = await loadCatalog();

  const plan = mod.planWorldRegionTransition({
    catalog,
    currentRegionCode: 'FR-BRE',
    nextRegionCode: 'GLOBAL',
    ownedItemIds: ['retired-item-v0'],
  });

  assert.deepEqual(plan.retainedOwnedItemIds, ['retired-item-v0']);
  assert.deepEqual(plan.ownedOutsideActiveCollectionIds, ['retired-item-v0']);
});

test('machine-readable transition contract forbids automatic location/FOMO mechanics', async () => {
  const cfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-region-transition-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const rules = cfg.rules.join(' ').toLowerCase();

  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(cfg.automaticRegionSwitch, false);
  assert.equal(cfg.switchReward, false);
  assert.equal(cfg.ownershipPersistsAcrossRegionSwitch, true);
  assert.equal(cfg.earnedResourceReset, false);
  assert.equal(cfg.ownedItemExpiry, false);
  assert.equal(cfg.outsideActiveCollectionPolicy, 'RETAIN_IN_INVENTORY_NOT_AUTO_PLACED');
  assert.match(rules, /never grants world resources/);
  assert.match(rules, /never removes or expires/);
  assert.match(rules, /exact location, geofencing and passive movement/);
});
