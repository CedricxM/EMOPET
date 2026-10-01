import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const enabled = process.env.WORLD_GAMIFICATION_DB_INTEGRATION === '1';
const runtimeTest = enabled ? test : test.skip;

let sqlClient = null;
let closeDatabase = null;

after(async () => {
  if (closeDatabase) await closeDatabase();
  if (sqlClient) await sqlClient.end({ timeout: 5 });
});

runtimeTest('WORLD-G2 durable ledger/build persistence is replay-safe, anti-farming, conflict-safe and privacy-visible', async () => {
  const [
    ledgerModule,
    postgresModule,
    buildModule,
    discoveryModule,
    residueModule,
    dbModule,
  ] = await Promise.all([
    import('../dist/api/services/world-progression-ledger.js'),
    import('../dist/api/services/world-progression-postgres.js'),
    import('../dist/api/services/world-build-postgres.js'),
    import('../dist/api/services/subject-discovery.js'),
    import('../dist/api/services/erasure-residue-verification.js'),
    import('../dist/db/index.js'),
  ]);

  closeDatabase = dbModule.closeDatabase;
  sqlClient = postgres(process.env.DATABASE_URL, { max: 4 });

  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const suffix = randomUUID().replaceAll('-', '');
  const catalog = JSON.parse(
    await readFile(
      new URL('../../config/world/world-regional-collections-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const globalCollection = catalog.collections.find((row) => row.regionCode === 'GLOBAL');
  const breizCollection = catalog.collections.find((row) => row.regionCode === 'FR-BRE');
  assert.ok(globalCollection);
  assert.ok(breizCollection);

  try {
    await sqlClient`INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`world-g2-a-${suffix}@example.test`}, 'test-only-hash', 'World G2 A'),
        (${ownerB}, ${`world-g2-b-${suffix}@example.test`}, 'test-only-hash', 'World G2 B')`;

    const sourceAuthority = {
      async isAuthorizedSource() {
        return true;
      },
    };
    const store = new postgresModule.PostgresWorldProgressionLedgerStore();
    const ledger = new ledgerModule.WorldProgressionLedgerService(store, sourceAuthority);

    const replayInput = {
      ownerId: ownerA,
      idempotencyKey: 'knowledge:g2:replay:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:g2:card:001',
    };
    const first = await ledger.record(replayInput);
    const replay = await ledger.record(replayInput);
    assert.equal(first.status, 'recorded');
    assert.equal(replay.status, 'duplicate');
    assert.equal(replay.entry.id, first.entry.id);

    await assert.rejects(
      () => ledger.record({
        ...replayInput,
        sourceRef: 'knowledge:g2:card:DIFFERENT',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT');
        return true;
      },
    );

    const sameSourceFreshKey = await ledger.record({
      ...replayInput,
      idempotencyKey: 'knowledge:g2:replay:002',
    });
    assert.equal(sameSourceFreshKey.status, 'duplicate');
    assert.equal(sameSourceFreshKey.entry.id, first.entry.id);

    const ownerBIndependent = await ledger.record({
      ...replayInput,
      ownerId: ownerB,
      idempotencyKey: 'knowledge:g2:owner-b:001',
    });
    assert.equal(ownerBIndependent.status, 'recorded');

    // Owner A reaches exactly 6 local discoveries and 4 community seeds.
    // Both target items are individually affordable, but not together.
    for (let index = 0; index < 3; index += 1) {
      await ledger.record({
        ownerId: ownerA,
        idempotencyKey: `place:g2:${index}:001`,
        kind: 'local.place_saved',
        sourceRef: `place:g2:${index}`,
      });
    }
    for (let index = 0; index < 2; index += 1) {
      await ledger.record({
        ownerId: ownerA,
        idempotencyKey: `community:g2:${index}:001`,
        kind: 'community.contribution_created',
        sourceRef: `community:g2:${index}`,
      });
    }

    const builder = new buildModule.PostgresWorldBuildService();
    const [globalBuild, breizBuild] = await Promise.all([
      builder.build({
        ownerId: ownerA,
        idempotencyKey: 'build:g2:community-bench:001',
        collection: globalCollection,
        itemId: 'community-bench',
      }),
      builder.build({
        ownerId: ownerA,
        idempotencyKey: 'build:g2:lighthouse:001',
        collection: breizCollection,
        itemId: 'breiz-mini-lighthouse',
      }),
    ]);

    const decisions = [globalBuild.decision, breizBuild.decision].sort();
    assert.deepEqual(decisions, ['built', 'insufficient_resources']);

    const balance = await store.getBalance(ownerA);
    for (const amount of Object.values(balance)) {
      assert.equal(amount >= 0, true, 'durable World balance must never be negative');
    }

    const [counts] = await sqlClient`
      SELECT
        (SELECT count(*)::int FROM world_progression_events WHERE owner_id = ${ownerA}) AS events,
        (SELECT count(*)::int FROM world_resource_spends WHERE owner_id = ${ownerA}) AS spends,
        (SELECT count(*)::int FROM world_owned_items WHERE owner_id = ${ownerA}) AS owned
    `;
    assert.equal(counts.events, 6);
    assert.equal(counts.spends, 1);
    assert.equal(counts.owned, 1);

    const discovery = await discoveryModule.discoverSubjectData(ownerA);
    assert.equal(discovery.ok, true);
    assert.equal(discovery.owner.worldProgressionEvents.count, 6);
    assert.equal(discovery.owner.worldResourceSpends.count, 1);
    assert.equal(discovery.owner.worldOwnedItems.count, 1);

    const snapshotResult = await residueModule.captureErasureVerificationSnapshot(ownerA);
    assert.equal(snapshotResult.ok, true);
    const residue = await residueModule.verifyErasureResidue(snapshotResult.snapshot);
    assert.equal(residue.ok, true);

    const probes = Object.fromEntries(
      residue.accountRelationProbes.map((probe) => [probe.key, probe.count]),
    );
    assert.equal(probes['world_progression_events.owner_id'], 6);
    assert.equal(probes['world_resource_spends.owner_id'], 1);
    assert.equal(probes['world_owned_items.owner_id'], 1);

    // Same-item concurrency cannot create duplicate ownership or a second spend.
    for (let index = 0; index < 2; index += 1) {
      await ledger.record({
        ownerId: ownerB,
        idempotencyKey: `memory:g2:b:${index}:001`,
        kind: 'memory.created',
        sourceRef: `memory:g2:b:${index}`,
      });
      await ledger.record({
        ownerId: ownerB,
        idempotencyKey: `knowledge:g2:b:${index}:001`,
        kind: 'knowledge.card_read',
        sourceRef: `knowledge:g2:b:${index}`,
      });
    }

    const sameItem = await Promise.all([
      builder.build({
        ownerId: ownerB,
        idempotencyKey: 'build:g2:memory-lantern:001',
        collection: globalCollection,
        itemId: 'memory-lantern',
      }),
      builder.build({
        ownerId: ownerB,
        idempotencyKey: 'build:g2:memory-lantern:002',
        collection: globalCollection,
        itemId: 'memory-lantern',
      }),
    ]);
    assert.deepEqual(
      sameItem.map((result) => result.decision).sort(),
      ['already_owned', 'built'],
    );

    const [sameItemCounts] = await sqlClient`
      SELECT
        (SELECT count(*)::int FROM world_resource_spends
          WHERE owner_id = ${ownerB} AND item_id = 'memory-lantern') AS spends,
        (SELECT count(*)::int FROM world_owned_items
          WHERE owner_id = ${ownerB} AND item_id = 'memory-lantern') AS owned
    `;
    assert.deepEqual(sameItemCounts, { spends: 1, owned: 1 });

    await sqlClient`
      DELETE FROM world_owned_items
      WHERE owner_id = ${ownerB}
        AND item_id = 'memory-lantern'
    `;
    await assert.rejects(
      () => builder.build({
        ownerId: ownerB,
        idempotencyKey: 'build:g2:memory-lantern:001',
        collection: globalCollection,
        itemId: 'memory-lantern',
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_BUILD_PERSISTENCE_INVARIANT');
        return true;
      },
    );
  } finally {
    await sqlClient`DELETE FROM world_resource_spends WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM world_owned_items WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM world_progression_events WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sqlClient`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
  }
});
