import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.WORLD_GAMIFICATION_READ_DB_INTEGRATION === '1';
const runtimeTest = enabled ? test : test.skip;

let sqlClient = null;
let closeDatabase = null;

after(async () => {
  if (closeDatabase) await closeDatabase();
  if (sqlClient) await sqlClient.end({ timeout: 5 });
});

runtimeTest('WORLD-G4 durable Owner snapshot is restart-safe, bounded and region-safe', async () => {
  const [
    ledgerModule,
    postgresModule,
    buildModule,
    readModule,
    catalogModule,
    dbModule,
  ] = await Promise.all([
    import('../dist/api/services/world-progression-ledger.js'),
    import('../dist/api/services/world-progression-postgres.js'),
    import('../dist/api/services/world-build-postgres.js'),
    import('../dist/api/services/world-gamification-read.js'),
    import('../dist/api/services/world-regional-catalog-runtime.js'),
    import('../dist/db/index.js'),
  ]);

  closeDatabase = dbModule.closeDatabase;
  sqlClient = postgres(process.env.DATABASE_URL, { max: 3 });

  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const suffix = randomUUID().replaceAll('-', '');

  const globalCollection = catalogModule.WORLD_REGIONAL_COLLECTION_CATALOG.collections
    .find((row) => row.regionCode === 'GLOBAL');
  assert.ok(globalCollection);

  try {
    await sqlClient`INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`world-g4-a-${suffix}@example.test`}, 'test-only-hash', 'World G4 A'),
        (${ownerB}, ${`world-g4-b-${suffix}@example.test`}, 'test-only-hash', 'World G4 B')`;

    const allowAllCanonicalFixtures = {
      async isAuthorizedSource() {
        return true;
      },
    };
    const store = new postgresModule.PostgresWorldProgressionLedgerStore();
    const ledger = new ledgerModule.WorldProgressionLedgerService(
      store,
      allowAllCanonicalFixtures,
    );

    for (let index = 0; index < 2; index += 1) {
      await ledger.record({
        ownerId: ownerA,
        idempotencyKey: `place:g4:a:${index}:001`,
        kind: 'local.place_saved',
        sourceRef: `place:g4:a:${index}`,
      });
      await ledger.record({
        ownerId: ownerA,
        idempotencyKey: `community:g4:a:${index}:001`,
        kind: 'community.contribution_created',
        sourceRef: `community:post:${randomUUID()}`,
      });
    }

    await ledger.record({
      ownerId: ownerB,
      idempotencyKey: 'knowledge:g4:b:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:g4:b:card',
    });

    const builder = new buildModule.PostgresWorldBuildService();
    const built = await builder.build({
      ownerId: ownerA,
      idempotencyKey: 'build:g4:community-bench:001',
      collection: globalCollection,
      itemId: 'community-bench',
    });
    assert.equal(built.decision, 'built');

    const first = await readModule.readWorldGamificationSnapshot({
      ownerId: ownerA,
      regionCode: 'FR-BRE',
    });

    assert.equal(first.authority, 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY');
    assert.equal(first.region.code, 'FR-BRE');
    assert.deepEqual(first.resources, {
      knowledgeFragments: 0,
      localDiscoveries: 2,
      walkTraces: 0,
      communitySeeds: 0,
      memoryThreads: 0,
    });
    assert.deepEqual(first.ownedItemIds, ['community-bench']);
    assert.equal(
      first.collectionItems.some((item) => item.id === 'community-bench'),
      false,
      'out-of-region ownership stays in inventory and is not auto-placed',
    );
    assert.equal(first.whyEarned.items.length, 4);
    assert.equal(
      first.whyEarned.items.every((item) => !Object.hasOwn(item, 'sourceRef')),
      true,
    );
    assert.equal(
      JSON.stringify(first).includes('world-g4-b'),
      false,
      'another Owner must never leak into the snapshot',
    );

    // A later durable grant must appear on the next read without relying on
    // process-memory counters or a cached browser model.
    await ledger.record({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:g4:a:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:g4:a:card',
    });

    const refreshed = await readModule.readWorldGamificationSnapshot({
      ownerId: ownerA,
      regionCode: 'FR-BRE',
    });
    assert.equal(refreshed.resources.knowledgeFragments, 1);
    assert.equal(refreshed.whyEarned.items.length, 5);

    const fallback = await readModule.readWorldGamificationSnapshot({
      ownerId: ownerA,
      regionCode: 'FR-UNKNOWN',
    });
    assert.equal(fallback.region.code, 'GLOBAL');

    for (const forbidden of [
      'xp',
      'level',
      'rank',
      'streak',
      'sensor',
      'eli',
      'latitude',
      'longitude',
      'geofence',
    ]) {
      assert.equal(
        JSON.stringify(refreshed).toLowerCase().includes(`"${forbidden}"`),
        false,
      );
    }
  } finally {
    await sqlClient`DELETE FROM world_resource_spends WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM world_owned_items WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM world_progression_events WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
  }
});
