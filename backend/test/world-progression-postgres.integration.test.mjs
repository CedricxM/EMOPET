import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-G2 durable progression repository enforces idempotence, anti-farming and atomic build spending', {
  skip: !enabled,
  timeout: 40_000,
}, async (t) => {
  const [{ default: postgres }, ledgerModule, persistenceModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/world-progression-ledger.js'),
    import('../dist/api/services/world-progression-postgres.js'),
    import('../dist/db/index.js'),
  ]);

  const sql = postgres(process.env.DATABASE_URL, { max: 4 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();

  t.after(async () => {
    try {
      await sql`DELETE FROM world_resource_spends WHERE owner_id IN (${ownerA}, ${ownerB})`;
      await sql`DELETE FROM world_owned_items WHERE owner_id IN (${ownerA}, ${ownerB})`;
      await sql`DELETE FROM world_progression_events WHERE owner_id IN (${ownerA}, ${ownerB})`;
      await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
    } finally {
      await sql.end({ timeout: 5 });
      await dbModule.closeDatabase();
    }
  });

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${ownerA}, ${`world-g2-a-${ownerA}@example.test`}, 'test-only-hash', 'World G2 A'),
      (${ownerB}, ${`world-g2-b-${ownerB}@example.test`}, 'test-only-hash', 'World G2 B')
  `;

  const sourceAuthority = {
    async isAuthorizedSource() {
      return true;
    },
  };

  const store = persistenceModule.drizzleWorldProgressionStore();
  const service = new ledgerModule.WorldProgressionLedgerService(store, sourceAuthority);

  const first = await service.record({
    ownerId: ownerA,
    idempotencyKey: 'knowledge:durable:001',
    kind: 'knowledge.card_read',
    sourceRef: 'knowledge:card:durable-001',
  });
  const replay = await service.record({
    ownerId: ownerA,
    idempotencyKey: 'knowledge:durable:001',
    kind: 'knowledge.card_read',
    sourceRef: 'knowledge:card:durable-001',
  });

  assert.equal(first.status, 'recorded');
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.entry.id, first.entry.id);
  assert.equal(replay.balance.knowledgeFragments, 1);

  const sourceReplay = await service.record({
    ownerId: ownerA,
    idempotencyKey: 'knowledge:durable:002',
    kind: 'knowledge.card_read',
    sourceRef: 'knowledge:card:durable-001',
  });
  assert.equal(sourceReplay.status, 'duplicate');
  assert.equal(sourceReplay.entry.id, first.entry.id);
  assert.equal(sourceReplay.balance.knowledgeFragments, 1);

  await assert.rejects(
    () => service.record({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:durable:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:card:different',
    }),
    (error) => {
      assert.equal(error.code, 'WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT');
      return true;
    },
  );

  for (let index = 0; index < 3; index += 1) {
    const result = await service.record({
      ownerId: ownerA,
      idempotencyKey: `place:durable:00${index}`,
      kind: 'local.place_saved',
      sourceRef: `place:durable:00${index}`,
    });
    assert.equal(result.status, 'recorded');
  }

  const lighthouse = {
    id: 'breiz-mini-lighthouse',
    title: 'Mini lighthouse',
    cost: { localDiscoveries: 5 },
  };
  const bench = {
    id: 'breiz-coastal-bench',
    title: 'Coastal bench',
    cost: { localDiscoveries: 5 },
  };
  const catalog = {
    fallbackRegionCode: 'GLOBAL',
    collections: [
      {
        regionCode: 'FR-BRE',
        companionIdentity: 'Breiz',
        items: [lighthouse, bench],
      },
      {
        regionCode: 'GLOBAL',
        companionIdentity: 'EMOPET',
        items: [
          {
            id: 'global-memory-lantern',
            title: 'Memory lantern',
            cost: { memoryThreads: 1 },
          },
        ],
      },
    ],
  };

  const [buildA, buildB] = await Promise.all([
    persistenceModule.buildWorldItemDurably({
      ownerId: ownerA,
      idempotencyKey: 'build:durable:lighthouse:001',
      regionCode: 'FR-BRE',
      itemId: lighthouse.id,
      catalog,
    }),
    persistenceModule.buildWorldItemDurably({
      ownerId: ownerA,
      idempotencyKey: 'build:durable:bench:001',
      regionCode: 'FR-BRE',
      itemId: bench.id,
      catalog,
    }),
  ]);

  assert.deepEqual(
    [buildA.decision, buildB.decision].sort(),
    ['built', 'insufficient_resources'],
  );

  const state = await persistenceModule.readWorldDurableProgressionState(ownerA);
  assert.equal(state.balance.knowledgeFragments, 1);
  assert.equal(state.balance.localDiscoveries, 1);
  assert.equal(state.ownedItems.length, 1);
  assert.equal(state.ownedItems[0].ownerId, ownerA);

  const builtItem = buildA.decision === 'built' ? lighthouse : bench;
  const builtKey = buildA.decision === 'built'
    ? 'build:durable:lighthouse:001'
    : 'build:durable:bench:001';

  const buildReplay = await persistenceModule.buildWorldItemDurably({
    ownerId: ownerA,
    idempotencyKey: builtKey,
    regionCode: 'FR-BRE',
    itemId: builtItem.id,
    catalog,
  });
  assert.equal(buildReplay.decision, 'already_owned');
  assert.equal(buildReplay.balance.localDiscoveries, 1);

  await assert.rejects(
    () => persistenceModule.buildWorldItemDurably({
      ownerId: ownerA,
      idempotencyKey: builtKey,
      regionCode: 'FR-BRE',
      itemId: builtItem.id === lighthouse.id ? bench.id : lighthouse.id,
      catalog,
    }),
    (error) => {
      assert.equal(error.code, 'WORLD_BUILD_IDEMPOTENCY_CONFLICT');
      return true;
    },
  );

  await assert.rejects(
    () => persistenceModule.buildWorldItemDurably({
      ownerId: randomUUID(),
      idempotencyKey: 'build:missing-owner:001',
      regionCode: 'GLOBAL',
      itemId: 'global-memory-lantern',
      catalog,
    }),
    (error) => {
      assert.equal(error.code, 'WORLD_BUILD_OWNER_NOT_FOUND');
      return true;
    },
  );

  const unknownBuild = await persistenceModule.buildWorldItemDurably({
    ownerId: ownerA,
    idempotencyKey: 'build:unknown-item:001',
    regionCode: 'FR-BRE',
    itemId: 'caller-invented-zero-cost-palace',
    catalog,
  });
  assert.equal(unknownBuild.decision, 'unknown_item');
  assert.equal(unknownBuild.balance.localDiscoveries, 1);

  // Persisted rows are not trusted merely because the database accepted them.
  // A grant that diverges from SAFE_WORLD_REWARDS must poison the read instead
  // of silently inflating the Owner balance.
  await sql`
    INSERT INTO world_progression_events
      (owner_id, idempotency_key, event_kind, source_ref, grants_json)
    VALUES
      (
        ${ownerB},
        'knowledge:corrupt:001',
        'knowledge.card_read',
        'knowledge:corrupt-source',
        ${sql.json({ knowledgeFragments: 99 })}
      )
  `;

  await assert.rejects(
    () => persistenceModule.readWorldDurableProgressionState(ownerB),
    (error) => {
      assert.equal(error.code, 'WORLD_PERSISTENCE_CORRUPT_EVENT');
      return true;
    },
  );
});
