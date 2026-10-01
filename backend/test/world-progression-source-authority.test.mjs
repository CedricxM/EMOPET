import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadSourceAuthorityModule() {
  const source = await readFile(
    new URL('../api/services/world-progression-source-authority.ts', import.meta.url),
    'utf8',
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  return {
    source,
    module: await import(
      `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
    ),
  };
}

const OWNER_ID = '11111111-1111-4111-8111-111111111111';

test('every authorised progression event has a canonical source-authority route', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  const progression = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const sourceAuthority = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-source-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );

  assert.deepEqual(
    new Set(Object.keys(mod.WORLD_PROGRESSION_SOURCE_ROUTES)),
    new Set(Object.keys(progression.rewards)),
  );
  assert.deepEqual(
    new Set(Object.keys(sourceAuthority.routes)),
    new Set(Object.keys(progression.rewards)),
  );
});

test('wrong source namespace fails closed before a domain verifier is called', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  let calls = 0;
  const authority = new mod.RoutedWorldProgressionSourceAuthority({
    'knowledge.card_read': async () => {
      calls += 1;
      return true;
    },
  });

  const result = await authority.isAuthorizedSource({
    ownerId: OWNER_ID,
    kind: 'knowledge.card_read',
    sourceRef: 'memory:not-a-knowledge-card',
  });

  assert.equal(result, false);
  assert.equal(calls, 0);
});

test('empty namespace suffix fails closed', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  let calls = 0;
  const authority = new mod.RoutedWorldProgressionSourceAuthority({
    'memory.created': async () => {
      calls += 1;
      return true;
    },
  });

  assert.equal(
    await authority.isAuthorizedSource({
      ownerId: OWNER_ID,
      kind: 'memory.created',
      sourceRef: 'memory:',
    }),
    false,
  );
  assert.equal(calls, 0);
});

test('missing verifier denies progression', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  const authority = new mod.RoutedWorldProgressionSourceAuthority({});

  assert.equal(
    await authority.isAuthorizedSource({
      ownerId: OWNER_ID,
      kind: 'world.group_joined',
      sourceRef: 'world-group:lorient-evening-walks',
    }),
    false,
  );
});

test('canonical claim is delegated unchanged to its domain verifier', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  let observed = null;
  const authority = new mod.RoutedWorldProgressionSourceAuthority({
    'local.place_saved': async (claim) => {
      observed = claim;
      return claim.ownerId === OWNER_ID && claim.sourceRef === 'place:harbor-path';
    },
  });

  const claim = {
    ownerId: OWNER_ID,
    kind: 'local.place_saved',
    sourceRef: 'place:harbor-path',
  };

  assert.equal(await authority.isAuthorizedSource(claim), true);
  assert.deepEqual(observed, claim);
});

test('domain verifier failure propagates for ledger fail-closed translation', async () => {
  const { module: mod } = await loadSourceAuthorityModule();
  const authority = new mod.RoutedWorldProgressionSourceAuthority({
    'community.contribution_created': async () => {
      throw new Error('community store unavailable');
    },
  });

  await assert.rejects(
    () => authority.isAuthorizedSource({
      ownerId: OWNER_ID,
      kind: 'community.contribution_created',
      sourceRef: 'community:post:001',
    }),
    /community store unavailable/,
  );
});

test('machine-readable source authority forbids caller-string trust and dog/Care authorities', async () => {
  const cfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-source-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const rules = cfg.rules.join(' ').toLowerCase();

  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(cfg.defaultDecision, 'DENY');
  assert.equal(cfg.unavailableDecision, 'FAIL_CLOSED');
  assert.match(rules, /never proof by itself/);
  assert.match(rules, /existence and owner scope/i);
  assert.match(rules, /care, eli, sensor and dog-performance/i);

  for (const route of Object.values(cfg.routes)) {
    assert.equal(route.ownerScopeRequired, true);
    assert.equal(route.canonicalExistenceRequired, true);
  }
});
