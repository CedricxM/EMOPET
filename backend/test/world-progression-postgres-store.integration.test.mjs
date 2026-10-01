import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

runtimeTest('durable World store preserves reward authority, Owner isolation and atomic build semantics', async () => {
  const [{ default: postgres }, storeModule, ledgerModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/world-progression-postgres-store.js'),
    import('../dist/api/services/world-progression-ledger.js'),
    import('../dist/db/index.js'),
  ]);

  const sql = postgres(databaseUrl, { max: 3 });
  const ownerA = randomUUID();
  const ownerB = randomUUID();

  try {
    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`world-store-a-${ownerA}@example.test`}, 'test-only-hash', 'World Store A'),
        (${ownerB}, ${`world-store-b-${ownerB}@example.test`}, 'test-only-hash', 'World Store B')
    `;

    const store = new storeModule.PostgresWorldProgressionStore();
    const sourceAuthority = {
      calls: 0,
      async isAuthorizedSource() {
        this.calls += 1;
        return true;
      },
    };
    const service = new ledgerModule.WorldProgressionLedgerService(store, sourceAuthority);

    const first = await service.record({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:store:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:store:card-001',
    });

    assert.equal(first.status, 'recorded');
    assert.equal(first.balance.knowledgeFragments, 1);
    assert.equal(sourceAuthority.calls, 1);

    const replay = await service.record({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:store:001',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:store:card-001',
    });

    assert.equal(replay.status, 'duplicate');
    assert.equal(replay.entry.id, first.entry.id);
    assert.equal(replay.balance.knowledgeFragments, 1);
    assert.equal(sourceAuthority.calls, 1);

    const sameSourceFreshKey = await service.record({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:store:002',
      kind: 'knowledge.card_read',
      sourceRef: 'knowledge:store:card-001',
    });

    assert.equal(sameSourceFreshKey.status, 'duplicate');
    assert.equal(sameSourceFreshKey.entry.id, first.entry.id);
    assert.equal(sameSourceFreshKey.balance.knowledgeFragments, 1);

    await assert.rejects(
      () => sql`
        INSERT INTO world_progression_events (
          owner_id, idempotency_key, event_kind, source_ref, grants_json
        ) VALUES (
          ${ownerA}, 'knowledge:forged:001', 'knowledge.card_read',
          'knowledge:forged:card', '{"knowledgeFragments":999999}'::jsonb
        )
      `,
      (error) => {
        assert.equal(error.code, '23514');
        assert.equal(error.constraint_name, 'chk_world_progression_events_reward_authority');
        return true;
      },
    );

    for (let index = 0; index < 3; index += 1) {
      const result = await service.record({
        ownerId: ownerA,
        idempotencyKey: `place:store:00${index}`,
        kind: 'local.place_saved',
        sourceRef: `place:store:${index}`,
      });
      assert.equal(result.status, 'recorded');
    }

    for (let index = 0; index < 3; index += 1) {
      const result = await service.record({
        ownerId: ownerA,
        idempotencyKey: `group:store:00${index}`,
        kind: 'world.group_joined',
        sourceRef: `world-group:store-${index}`,
      });
      assert.equal(result.status, 'recorded');
    }

    const regionalCatalog = JSON.parse(
      await readFile(
        new URL('../../config/world/world-regional-collections-v1.json', import.meta.url),
        'utf8',
      ),
    );
    const breiz = regionalCatalog.collections.find(
      (collection) => collection.regionCode === 'FR-BRE',
    );
    assert.ok(breiz);

    const requests = [
      {
        ownerId: ownerA,
        idempotencyKey: 'build:store:lighthouse:001',
        collection: breiz,
        itemId: 'breiz-mini-lighthouse',
      },
      {
        ownerId: ownerA,
        idempotencyKey: 'build:store:lighthouse:002',
        collection: breiz,
        itemId: 'breiz-mini-lighthouse',
      },
    ];

    const results = await Promise.all(requests.map((input) => store.buildItem(input)));
    assert.deepEqual(
      results.map((result) => result.decision).sort(),
      ['already_owned', 'built'],
    );

    const builtIndex = results.findIndex((result) => result.decision === 'built');
    assert.ok(builtIndex >= 0);
    const builtReplay = await store.buildItem(requests[builtIndex]);
    assert.equal(builtReplay.decision, 'already_owned');
    assert.equal(builtReplay.replayed, true);

    assert.deepEqual(await store.getBalance(ownerA), {
      knowledgeFragments: 1,
      localDiscoveries: 1,
      walkTraces: 0,
      communitySeeds: 0,
      memoryThreads: 0,
    });
    assert.deepEqual(await store.listOwnedItemIds(ownerA), ['breiz-mini-lighthouse']);

    assert.deepEqual(await store.getBalance(ownerB), {
      knowledgeFragments: 0,
      localDiscoveries: 0,
      walkTraces: 0,
      communitySeeds: 0,
      memoryThreads: 0,
    });
    assert.deepEqual(await store.listOwnedItemIds(ownerB), []);

    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM world_resource_spends WHERE owner_id = ${ownerA}) AS spends,
        (SELECT count(*)::int FROM world_owned_items WHERE owner_id = ${ownerA}) AS owned
    `;
    assert.deepEqual(counts, { spends: 1, owned: 1 });
  } finally {
    await sql`DELETE FROM world_resource_spends WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sql`DELETE FROM world_owned_items WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sql`DELETE FROM world_progression_events WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
    await sql.end({ timeout: 5 });
    await dbModule.closeDatabase();
  }
});
