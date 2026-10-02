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

async function loadModules() {
  const ledger = await transpile('../api/services/world-progression-ledger.ts');
  const importer = await transpile('../api/services/world-legacy-progression-replay.ts');

  const ledgerUrl = dataUrl(ledger.output);
  const importerOutput = importer.output.replace(
    /from ['"]\.\/world-progression-ledger['"]/,
    `from '${ledgerUrl}'`,
  );

  return {
    ledgerSource: ledger.source,
    importerSource: importer.source,
    ledger: await import(ledgerUrl),
    importer: await import(dataUrl(importerOutput)),
  };
}

const OWNER_A = '11111111-1111-4111-8111-111111111111';
const OWNER_B = '22222222-2222-4222-8222-222222222222';

function makeAuthority(allowed) {
  return {
    async isAuthorizedSource(claim) {
      return allowed.has(`${claim.ownerId}|${claim.kind}|${claim.sourceRef}`);
    },
  };
}

test('safe legacy knowledge replay records exactly one server-derived reward', async () => {
  const { ledger, importer } = await loadModules();
  const allowed = new Set([
    `${OWNER_A}|knowledge.card_read|knowledge:card:001`,
  ]);
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(allowed),
    () => new Date('2026-10-01T20:00:00.000Z'),
    () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  const result = await replay.replay({
    ownerId: OWNER_A,
    surface: 'knowledge_cards_read',
    legacyRecordId: 'legacy-browser-card-001',
    canonicalSourceRef: 'knowledge:card:001',
  });

  assert.equal(result.status, 'recorded');
  assert.equal(result.eventKind, 'knowledge.card_read');
  assert.deepEqual(result.entry.grants, { knowledgeFragments: 1 });
  assert.equal(result.balance.knowledgeFragments, 1);
});

test('same legacy record replay is deterministic and idempotent', async () => {
  const { ledger, importer } = await loadModules();
  const allowed = new Set([
    `${OWNER_A}|local.place_saved|place:harbor-path`,
  ]);
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  let ids = 0;
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(allowed),
    () => new Date('2026-10-01T20:00:00.000Z'),
    () => `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${++ids}`,
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  const input = {
    ownerId: OWNER_A,
    surface: 'saved_map_spots',
    legacyRecordId: 'spot-browser-id-001',
    canonicalSourceRef: 'place:harbor-path',
  };

  const first = await replay.replay(input);
  const second = await replay.replay(input);

  assert.equal(first.status, 'recorded');
  assert.equal(second.status, 'duplicate');
  assert.equal(second.entry.id, first.entry.id);
  assert.equal(second.balance.localDiscoveries, 2);
  assert.equal(second.entry.idempotencyKey, first.entry.idempotencyKey);
});

test('different legacy ids for the same canonical source still mint at most once', async () => {
  const { ledger, importer } = await loadModules();
  const allowed = new Set([
    `${OWNER_A}|world.group_joined|world-group:lorient-evening-walks`,
  ]);
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  let ids = 0;
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(allowed),
    () => new Date('2026-10-01T20:00:00.000Z'),
    () => `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${++ids}`,
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  const first = await replay.replay({
    ownerId: OWNER_A,
    surface: 'community_memberships',
    legacyRecordId: 'membership-object-A',
    canonicalSourceRef: 'world-group:lorient-evening-walks',
  });
  const second = await replay.replay({
    ownerId: OWNER_A,
    surface: 'community_memberships',
    legacyRecordId: 'membership-object-B',
    canonicalSourceRef: 'world-group:lorient-evening-walks',
  });

  assert.equal(first.status, 'recorded');
  assert.equal(second.status, 'duplicate');
  assert.equal(second.entry.id, first.entry.id);
  assert.equal(second.balance.communitySeeds, 1);
});

test('unsupported legacy surfaces fail before any ledger reward attempt', async () => {
  const { importer } = await loadModules();
  let calls = 0;
  const fakeLedger = {
    async record() {
      calls += 1;
      throw new Error('should not be called');
    },
  };
  const replay = new importer.LegacyWorldProgressionReplayImporter(fakeLedger);

  for (const surface of [
    'journal_entries',
    'community_events',
    'aggregate_counters',
    'walk_recorded_counts',
  ]) {
    await assert.rejects(
      () => replay.replay({
        ownerId: OWNER_A,
        surface,
        legacyRecordId: 'legacy-id',
        canonicalSourceRef: 'route:not-allowed',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_LEGACY_REPLAY_SURFACE_NOT_ALLOWED');
        return true;
      },
    );
  }
  assert.equal(calls, 0);
});

test('raw legacy record ids are hashed and never persisted as ledger evidence', async () => {
  const { ledger, importer } = await loadModules();
  const rawId = 'private-browser-record-raw-value-XYZ';
  const allowed = new Set([
    `${OWNER_A}|knowledge.card_read|knowledge:card:private`,
  ]);
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(allowed),
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  const result = await replay.replay({
    ownerId: OWNER_A,
    surface: 'knowledge_cards_read',
    legacyRecordId: rawId,
    canonicalSourceRef: 'knowledge:card:private',
  });

  assert.equal(result.entry.idempotencyKey.includes(rawId), false);
  assert.equal(result.entry.sourceRef.includes(rawId), false);
  assert.match(
    result.entry.idempotencyKey,
    /^legacy:knowledge_cards_read:[0-9a-f]{40}$/,
  );
});

test('source-authority denial remains fail closed during legacy replay', async () => {
  const { ledger, importer } = await loadModules();
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(new Set()),
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  await assert.rejects(
    () => replay.replay({
      ownerId: OWNER_A,
      surface: 'saved_map_spots',
      legacyRecordId: 'spot-unauthorised',
      canonicalSourceRef: 'place:not-canonical-for-owner',
    }),
    (error) => {
      assert.equal(error.code, 'WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED');
      return true;
    },
  );
});

test('same legacy id for different Owners produces separate replay identities', async () => {
  const { ledger, importer } = await loadModules();
  const allowed = new Set([
    `${OWNER_A}|knowledge.card_read|knowledge:shared-card`,
    `${OWNER_B}|knowledge.card_read|knowledge:shared-card`,
  ]);
  const store = new ledger.InMemoryWorldProgressionLedgerStore();
  const service = new ledger.WorldProgressionLedgerService(
    store,
    makeAuthority(allowed),
  );
  const replay = new importer.LegacyWorldProgressionReplayImporter(service);

  const a = await replay.replay({
    ownerId: OWNER_A,
    surface: 'knowledge_cards_read',
    legacyRecordId: 'same-browser-record-id',
    canonicalSourceRef: 'knowledge:shared-card',
  });
  const b = await replay.replay({
    ownerId: OWNER_B,
    surface: 'knowledge_cards_read',
    legacyRecordId: 'same-browser-record-id',
    canonicalSourceRef: 'knowledge:shared-card',
  });

  assert.notEqual(a.entry.idempotencyKey, b.entry.idempotencyKey);
  assert.equal(a.balance.knowledgeFragments, 1);
  assert.equal(b.balance.knowledgeFragments, 1);
});

test('machine-readable replay authority and implementation stay aligned', async () => {
  const { importerSource } = await loadModules();
  const cfg = JSON.parse(
    await readFile(
      new URL('../../config/world/world-legacy-replay-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(cfg.status, 'CONTROLLED_DRAFT_NOT_RUNTIME_AUTHORITY');
  assert.equal(cfg.productionAuthority, false);
  assert.equal(cfg.bulkCounterImport, false);
  assert.equal(cfg.callerSuppliedRewards, false);
  assert.equal(cfg.rawLegacyRecordIdPersisted, false);

  for (const [surface, rule] of Object.entries(cfg.allowedReplaySurfaces)) {
    assert.equal(importerSource.includes(surface), true);
    assert.equal(importerSource.includes(rule.eventKind), true);
  }

  for (const forbidden of cfg.explicitlyNotReplayable) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(cfg.allowedReplaySurfaces, forbidden),
      false,
    );
  }
});

test('legacy replay input contract accepts no reward quantity or aggregate count', async () => {
  const { importerSource } = await loadModules();
  const match = importerSource.match(
    /export interface LegacyWorldReplayInput \{([\s\S]*?)\n\}/,
  );
  assert.ok(match);
  assert.doesNotMatch(match[1], /grant|reward|points|xp|count|amount|balance/i);
});
