import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

const RESOURCES = [
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
];

function emptyBalance() {
  return Object.fromEntries(RESOURCES.map((resource) => [resource, 0]));
}

function applyGrant(balance, grant, sign = 1) {
  for (const resource of RESOURCES) {
    const amount = Number(grant?.[resource] ?? 0);
    balance[resource] += sign * amount;
  }
}

runtimeTest('G1B.2 disposable PostgreSQL contract proves Owner boundary, idempotency, canonical-source uniqueness and conflict-safe build spend', async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(databaseUrl, { max: 6 });

  const suffix = randomUUID().replaceAll('-', '');
  const schemaName = `world_g1b2_${suffix}`;
  const eventsTable = 'world_progression_events';
  const spendsTable = 'world_resource_spends';
  const ownedTable = 'world_owned_items';

  const ownerA = randomUUID();
  const ownerB = randomUUID();

  t.after(async () => {
    try {
      await sql`DROP SCHEMA IF EXISTS ${sql(schemaName)} CASCADE`;
      await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
    } finally {
      await sql.end({ timeout: 5 });
    }
  });

  await sql`INSERT INTO users (id, email, password_hash, name)
    VALUES
      (${ownerA}, ${`world-g1b2-a-${suffix}@example.test`}, 'test-only-hash', 'G1B2 A'),
      (${ownerB}, ${`world-g1b2-b-${suffix}@example.test`}, 'test-only-hash', 'G1B2 B')`;

  await sql`CREATE SCHEMA ${sql(schemaName)}`;

  await sql`
    CREATE TABLE ${sql(schemaName)}.${sql(eventsTable)} (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES public.users(id),
      idempotency_key varchar(128) NOT NULL,
      event_kind varchar(100) NOT NULL,
      source_ref varchar(160) NOT NULL,
      grants_json jsonb NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT world_g1b2_event_idempotency UNIQUE (owner_id, idempotency_key),
      CONSTRAINT world_g1b2_event_source UNIQUE (owner_id, event_kind, source_ref)
    )
  `;

  await sql`
    CREATE TABLE ${sql(schemaName)}.${sql(spendsTable)} (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES public.users(id),
      idempotency_key varchar(128) NOT NULL,
      item_id varchar(160) NOT NULL,
      cost_json jsonb NOT NULL,
      recorded_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT world_g1b2_spend_idempotency UNIQUE (owner_id, idempotency_key)
    )
  `;

  await sql`
    CREATE TABLE ${sql(schemaName)}.${sql(ownedTable)} (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES public.users(id),
      item_id varchar(160) NOT NULL,
      region_code varchar(16) NOT NULL,
      built_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT world_g1b2_owned_item UNIQUE (owner_id, item_id)
    )
  `;

  async function appendEvent({
    ownerId,
    idempotencyKey,
    eventKind,
    sourceRef,
    grants,
  }) {
    return sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}::text, 0))`;

      const [existing] = await tx`
        SELECT id, owner_id, idempotency_key, event_kind, source_ref, grants_json, recorded_at
        FROM ${sql(schemaName)}.${sql(eventsTable)}
        WHERE owner_id = ${ownerId}
          AND idempotency_key = ${idempotencyKey}
      `;

      if (existing) {
        if (
          existing.event_kind !== eventKind
          || existing.source_ref !== sourceRef
          || JSON.stringify(existing.grants_json) !== JSON.stringify(grants)
        ) {
          throw new Error('WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT');
        }
        return { status: 'duplicate', entry: existing };
      }

      const [inserted] = await tx`
        INSERT INTO ${sql(schemaName)}.${sql(eventsTable)}
          (id, owner_id, idempotency_key, event_kind, source_ref, grants_json)
        VALUES
          (${randomUUID()}, ${ownerId}, ${idempotencyKey}, ${eventKind}, ${sourceRef}, ${tx.json(grants)})
        RETURNING id, owner_id, idempotency_key, event_kind, source_ref, grants_json, recorded_at
      `;

      return { status: 'recorded', entry: inserted };
    });
  }

  async function readBalance(tx, ownerId) {
    const eventRows = await tx`
      SELECT grants_json
      FROM ${sql(schemaName)}.${sql(eventsTable)}
      WHERE owner_id = ${ownerId}
    `;
    const spendRows = await tx`
      SELECT cost_json
      FROM ${sql(schemaName)}.${sql(spendsTable)}
      WHERE owner_id = ${ownerId}
    `;

    const balance = emptyBalance();
    for (const row of eventRows) applyGrant(balance, row.grants_json, 1);
    for (const row of spendRows) applyGrant(balance, row.cost_json, -1);
    return balance;
  }

  async function buildItem({
    ownerId,
    idempotencyKey,
    itemId,
    regionCode,
    cost,
    failAfterSpend = false,
  }) {
    return sql.begin(async (tx) => {
      // Per-Owner transaction lock is the conflict-safe equivalent required by
      // G1B.2 until the final production store chooses its isolation mechanism.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}::text, 1))`;

      const [alreadyOwned] = await tx`
        SELECT id
        FROM ${sql(schemaName)}.${sql(ownedTable)}
        WHERE owner_id = ${ownerId}
          AND item_id = ${itemId}
      `;
      if (alreadyOwned) return { decision: 'already_owned' };

      const balance = await readBalance(tx, ownerId);
      const affordable = RESOURCES.every(
        (resource) => balance[resource] >= Number(cost?.[resource] ?? 0),
      );
      if (!affordable) return { decision: 'insufficient_resources', balance };

      await tx`
        INSERT INTO ${sql(schemaName)}.${sql(spendsTable)}
          (id, owner_id, idempotency_key, item_id, cost_json)
        VALUES
          (${randomUUID()}, ${ownerId}, ${idempotencyKey}, ${itemId}, ${tx.json(cost)})
      `;

      if (failAfterSpend) {
        throw new Error('WORLD_G1B2_INJECTED_BUILD_FAILURE');
      }

      await tx`
        INSERT INTO ${sql(schemaName)}.${sql(ownedTable)}
          (id, owner_id, item_id, region_code)
        VALUES
          (${randomUUID()}, ${ownerId}, ${itemId}, ${regionCode})
      `;

      return {
        decision: 'built',
        balance: await readBalance(tx, ownerId),
      };
    });
  }

  await assert.rejects(
    () => sql`
      INSERT INTO ${sql(schemaName)}.${sql(eventsTable)}
        (id, owner_id, idempotency_key, event_kind, source_ref, grants_json)
      VALUES
        (${randomUUID()}, ${randomUUID()}, 'missing-owner-001', 'knowledge.card_read', 'knowledge:missing', ${sql.json({ knowledgeFragments: 1 })})
    `,
    (error) => {
      assert.equal(error.code, '23503');
      return true;
    },
  );

  const replayInput = {
    ownerId: ownerA,
    idempotencyKey: 'knowledge:replay:001',
    eventKind: 'knowledge.card_read',
    sourceRef: 'knowledge:card:001',
    grants: { knowledgeFragments: 1 },
  };
  const first = await appendEvent(replayInput);
  const replay = await appendEvent(replayInput);
  assert.equal(first.status, 'recorded');
  assert.equal(replay.status, 'duplicate');
  assert.equal(replay.entry.id, first.entry.id);

  await assert.rejects(
    () => appendEvent({
      ...replayInput,
      sourceRef: 'knowledge:card:DIFFERENT',
    }),
    /WORLD_PROGRESSION_IDEMPOTENCY_CONFLICT/,
  );

  await assert.rejects(
    () => appendEvent({
      ownerId: ownerA,
      idempotencyKey: 'knowledge:fresh-key:002',
      eventKind: 'knowledge.card_read',
      sourceRef: replayInput.sourceRef,
      grants: { knowledgeFragments: 1 },
    }),
    (error) => {
      assert.equal(error.code, '23505');
      assert.equal(error.constraint_name, 'world_g1b2_event_source');
      return true;
    },
  );

  // Same canonical source is independently allowed for another Owner.
  const otherOwner = await appendEvent({
    ownerId: ownerB,
    idempotencyKey: 'knowledge:owner-b:001',
    eventKind: 'knowledge.card_read',
    sourceRef: replayInput.sourceRef,
    grants: { knowledgeFragments: 1 },
  });
  assert.equal(otherOwner.status, 'recorded');

  for (let index = 0; index < 3; index += 1) {
    await appendEvent({
      ownerId: ownerA,
      idempotencyKey: `place:seed:${index}`,
      eventKind: 'local.place_saved',
      sourceRef: `place:seed:${index}`,
      grants: { localDiscoveries: 2 },
    });
  }

  const cost = { localDiscoveries: 5 };
  const [buildA, buildB] = await Promise.all([
    buildItem({
      ownerId: ownerA,
      idempotencyKey: 'build:lighthouse:001',
      itemId: 'breiz-mini-lighthouse',
      regionCode: 'FR-BRE',
      cost,
    }),
    buildItem({
      ownerId: ownerA,
      idempotencyKey: 'build:bench:001',
      itemId: 'breiz-coastal-bench',
      regionCode: 'FR-BRE',
      cost,
    }),
  ]);

  const decisions = [buildA.decision, buildB.decision].sort();
  assert.deepEqual(decisions, ['built', 'insufficient_resources']);

  const finalBalance = await readBalance(sql, ownerA);
  assert.equal(finalBalance.localDiscoveries, 1);
  for (const value of Object.values(finalBalance)) {
    assert.equal(value >= 0, true, 'conflict-safe build must never create a negative resource balance');
  }

  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(spendsTable)} WHERE owner_id = ${ownerA}) AS spends,
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(ownedTable)} WHERE owner_id = ${ownerA}) AS owned
  `;
  assert.equal(counts.spends, 1);
  assert.equal(counts.owned, 1);

  for (let index = 0; index < 3; index += 1) {
    await appendEvent({
      ownerId: ownerB,
      idempotencyKey: `place:owner-b:${index}`,
      eventKind: 'local.place_saved',
      sourceRef: `place:owner-b:${index}`,
      grants: { localDiscoveries: 2 },
    });
  }

  await assert.rejects(
    () => buildItem({
      ownerId: ownerB,
      idempotencyKey: 'build:rollback:001',
      itemId: 'rollback-only-item',
      regionCode: 'GLOBAL',
      cost: { localDiscoveries: 1 },
      failAfterSpend: true,
    }),
    /WORLD_G1B2_INJECTED_BUILD_FAILURE/,
  );

  const [rollbackCounts] = await sql`
    SELECT
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(spendsTable)}
        WHERE owner_id = ${ownerB} AND item_id = 'rollback-only-item') AS spends,
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(ownedTable)}
        WHERE owner_id = ${ownerB} AND item_id = 'rollback-only-item') AS owned
  `;
  assert.deepEqual(rollbackCounts, { spends: 0, owned: 0 });

  const sameItemResults = await Promise.all([
    buildItem({
      ownerId: ownerB,
      idempotencyKey: 'build:same-item:001',
      itemId: 'global-community-bench',
      regionCode: 'GLOBAL',
      cost: { localDiscoveries: 5 },
    }),
    buildItem({
      ownerId: ownerB,
      idempotencyKey: 'build:same-item:002',
      itemId: 'global-community-bench',
      regionCode: 'GLOBAL',
      cost: { localDiscoveries: 5 },
    }),
  ]);

  assert.deepEqual(
    sameItemResults.map((result) => result.decision).sort(),
    ['already_owned', 'built'],
  );

  const [sameItemCounts] = await sql`
    SELECT
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(spendsTable)}
        WHERE owner_id = ${ownerB} AND item_id = 'global-community-bench') AS spends,
      (SELECT count(*)::int FROM ${sql(schemaName)}.${sql(ownedTable)}
        WHERE owner_id = ${ownerB} AND item_id = 'global-community-bench') AS owned
  `;
  assert.deepEqual(sameItemCounts, { spends: 1, owned: 1 });
});
