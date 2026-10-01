import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadProvenanceModule() {
  const source = await readFile(
    new URL('../api/services/world-progression-provenance.ts', import.meta.url),
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

function entry(overrides = {}) {
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

test('provenance explains earned resources from authorised ledger entries', async () => {
  const { module: mod } = await loadProvenanceModule();

  const projection = mod.projectWorldProgressionProvenance({
    ownerId: OWNER_ID,
    entries: [
      entry(),
      entry({
        id: 'entry-2',
        idempotencyKey: 'place:key:001',
        kind: 'local.place_saved',
        sourceRef: 'place:harbor-path',
        grants: { localDiscoveries: 2 },
        recordedAt: new Date('2026-10-01T15:00:00.000Z'),
      }),
    ],
  });

  assert.equal(projection.authority, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(projection.ownerId, OWNER_ID);
  assert.deepEqual(
    projection.items.map((item) => item.reasonCode),
    ['local_place_saved', 'knowledge_read'],
  );
  assert.deepEqual(projection.grossEarned, {
    knowledgeFragments: 1,
    localDiscoveries: 2,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  });
});

test('provenance rejects mixed-Owner ledger input', async () => {
  const { module: mod } = await loadProvenanceModule();

  assert.throws(
    () => mod.projectWorldProgressionProvenance({
      ownerId: OWNER_ID,
      entries: [
        entry(),
        entry({
          id: 'entry-2',
          ownerId: '22222222-2222-4222-8222-222222222222',
        }),
      ],
    }),
    /OWNER_SCOPE_MISMATCH/,
  );
});

test('duplicate ledger ids fail closed instead of being silently hidden', async () => {
  const { module: mod } = await loadProvenanceModule();

  assert.throws(
    () => mod.projectWorldProgressionProvenance({
      ownerId: OWNER_ID,
      entries: [
        entry(),
        entry({
          id: 'entry-1',
          idempotencyKey: 'knowledge:key:002',
          sourceRef: 'knowledge:card:two',
        }),
      ],
    }),
    /DUPLICATE_ENTRY/,
  );
});

test('provenance enforces bounded output limits', async () => {
  const { module: mod } = await loadProvenanceModule();

  for (const limit of [0, 101, 1.5]) {
    assert.throws(
      () => mod.projectWorldProgressionProvenance({
        ownerId: OWNER_ID,
        entries: [],
        limit,
      }),
      /INVALID_LIMIT/,
    );
  }

  const entries = Array.from({ length: 3 }, (_, index) =>
    entry({
      id: `entry-${index}`,
      idempotencyKey: `knowledge:key:${index}`,
      sourceRef: `knowledge:card:${index}`,
      recordedAt: new Date(`2026-10-01T14:0${index}:00.000Z`),
    }),
  );
  const projection = mod.projectWorldProgressionProvenance({
    ownerId: OWNER_ID,
    entries,
    limit: 2,
  });
  assert.equal(projection.items.length, 2);
});

test('machine-readable provenance reasons stay aligned with safe progression events', async () => {
  const { source, module: mod } = await loadProvenanceModule();
  const provenance = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-provenance-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const progression = JSON.parse(
    await readFile(
      new URL('../../config/world/world-progression-authority-v1.json', import.meta.url),
      'utf8',
    ),
  );

  assert.equal(provenance.status, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
  assert.equal(provenance.freeTextReason, false);
  assert.equal(provenance.exactLocationExposure, false);
  assert.deepEqual(
    new Set(Object.keys(provenance.reasonCodes)),
    new Set(Object.keys(progression.rewards)),
  );
  assert.deepEqual(provenance.reasonCodes, mod.WORLD_PROGRESSION_REASON_CODES);

  assert.match(source, /No caller free text, exact location, Care,/);
});

test('projection copies grants instead of exposing mutable ledger grant objects', async () => {
  const { module: mod } = await loadProvenanceModule();
  const original = entry();

  const projection = mod.projectWorldProgressionProvenance({
    ownerId: OWNER_ID,
    entries: [original],
  });

  projection.items[0].grants.knowledgeFragments = 999;
  assert.equal(original.grants.knowledgeFragments, 1);
});
