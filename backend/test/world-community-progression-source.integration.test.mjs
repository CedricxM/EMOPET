import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.WORLD_COMMUNITY_SOURCE_DB_INTEGRATION === '1';
const runtimeTest = enabled ? test : test.skip;

let sql = null;
let closeDatabase = null;

after(async () => {
  if (closeDatabase) await closeDatabase();
  if (sql) await sql.end({ timeout: 5 });
});

runtimeTest('WORLD-G3 Community canonical source routes through durable progression authority', async () => {
  const [
    sourceModule,
    sourceAuthorityModule,
    ledgerModule,
    postgresModule,
    dbModule,
  ] = await Promise.all([
    import('../dist/api/services/world-community-progression-source.js'),
    import('../dist/api/services/world-progression-source-authority.js'),
    import('../dist/api/services/world-progression-ledger.js'),
    import('../dist/api/services/world-progression-postgres.js'),
    import('../dist/db/index.js'),
  ]);

  closeDatabase = dbModule.closeDatabase;
  sql = postgres(process.env.DATABASE_URL, { max: 2 });

  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const communityId = randomUUID();
  const postA = randomUUID();
  const postB = randomUUID();
  const eventA = randomUUID();
  const suffix = randomUUID().replaceAll('-', '');

  try {
    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES
        (${ownerA}, ${`world-community-a-${suffix}@example.test`}, 'test-only', 'World Community A'),
        (${ownerB}, ${`world-community-b-${suffix}@example.test`}, 'test-only', 'World Community B')
    `;

    await sql`
      INSERT INTO communities (id, name, type, created_by)
      VALUES (${communityId}, 'Canonical Community', 'activity', ${ownerA})
    `;

    await sql`
      INSERT INTO posts (id, community_id, author_id, type, content, sensor_overlay)
      VALUES
        (${postA}, ${communityId}, ${ownerA}, 'discussion', 'Owner A private-ish body', ${sql.json({ ignoredForProgression: true })}),
        (${postB}, ${communityId}, ${ownerB}, 'discussion', 'Owner B body', null)
    `;

    await sql`
      INSERT INTO community_events (
        id, community_id, created_by, title, description, location, latitude, longitude, starts_at
      )
      VALUES (
        ${eventA},
        ${communityId},
        ${ownerA},
        'Canonical Event',
        'Description must never enter progression',
        'Precise event location',
        48.8,
        2.1,
        ${new Date('2026-10-20T18:00:00.000Z')}
      )
    `;

    const verifier = sourceModule.drizzleCommunityContributionSourceVerifier();
    const routedAuthority = new sourceAuthorityModule.RoutedWorldProgressionSourceAuthority({
      'community.contribution_created': verifier,
    });
    const store = new postgresModule.PostgresWorldProgressionLedgerStore();
    const ledger = new ledgerModule.WorldProgressionLedgerService(store, routedAuthority);

    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'community.contribution_created',
        sourceRef: `community:post:${postA}`,
      }),
      true,
    );
    assert.equal(
      await verifier({
        ownerId: ownerB,
        kind: 'community.contribution_created',
        sourceRef: `community:post:${postA}`,
      }),
      false,
    );
    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'community.contribution_created',
        sourceRef: `community:event:${eventA}`,
      }),
      true,
    );

    const postResult = await ledger.record({
      ownerId: ownerA,
      idempotencyKey: 'community:canonical:post:001',
      kind: 'community.contribution_created',
      sourceRef: `community:post:${postA}`,
    });
    assert.equal(postResult.status, 'recorded');
    assert.deepEqual(postResult.entry.grants, { communitySeeds: 2 });

    const postReplay = await ledger.record({
      ownerId: ownerA,
      idempotencyKey: 'community:canonical:post:001',
      kind: 'community.contribution_created',
      sourceRef: `community:post:${postA}`,
    });
    assert.equal(postReplay.status, 'duplicate');
    assert.equal(postReplay.entry.id, postResult.entry.id);

    const eventResult = await ledger.record({
      ownerId: ownerA,
      idempotencyKey: 'community:canonical:event:001',
      kind: 'community.contribution_created',
      sourceRef: `community:event:${eventA}`,
    });
    assert.equal(eventResult.status, 'recorded');
    assert.equal(eventResult.balance.communitySeeds, 4);

    await assert.rejects(
      () => ledger.record({
        ownerId: ownerB,
        idempotencyKey: 'community:foreign:post:001',
        kind: 'community.contribution_created',
        sourceRef: `community:post:${postA}`,
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED');
        return true;
      },
    );

    await assert.rejects(
      () => ledger.record({
        ownerId: ownerA,
        idempotencyKey: 'community:wrong-kind:001',
        kind: 'knowledge.card_read',
        sourceRef: `community:post:${postA}`,
      }),
      (error) => {
        assert.equal(error.code, 'WORLD_PROGRESSION_SOURCE_NOT_AUTHORIZED');
        return true;
      },
    );

    const rows = await sql`
      SELECT idempotency_key, event_kind, source_ref, grants_json
      FROM world_progression_events
      WHERE owner_id = ${ownerA}
      ORDER BY recorded_at, id
    `;
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.event_kind),
      ['community.contribution_created', 'community.contribution_created'],
    );
    assert.deepEqual(
      rows.map((row) => row.grants_json),
      [{ communitySeeds: 2 }, { communitySeeds: 2 }],
    );

    const durableJson = JSON.stringify(rows);
    for (const forbidden of [
      'Owner A private-ish body',
      'ignoredForProgression',
      'Description must never enter progression',
      'Precise event location',
      '48.8',
      '2.1',
    ]) {
      assert.equal(
        durableJson.includes(forbidden),
        false,
        `durable progression must not copy Community payload: ${forbidden}`,
      );
    }

    const parsed = sourceModule.parseCommunityContributionSourceRef(
      `community:post:${postB.toUpperCase()}`,
    );
    assert.deepEqual(parsed, { type: 'post', id: postB });

    for (const sourceRef of [
      `community:comment:${randomUUID()}`,
      `community:membership:${randomUUID()}`,
      'community:post:not-a-uuid',
    ]) {
      assert.equal(
        await verifier({
          ownerId: ownerA,
          kind: 'community.contribution_created',
          sourceRef,
        }),
        false,
      );
    }

    await sql`UPDATE posts SET author_id = null WHERE id = ${postA}`;
    await sql`UPDATE community_events SET created_by = null WHERE id = ${eventA}`;

    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'community.contribution_created',
        sourceRef: `community:post:${postA}`,
      }),
      false,
    );
    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'community.contribution_created',
        sourceRef: `community:event:${eventA}`,
      }),
      false,
    );

    // A durable replay stays idempotent after the canonical source is detached.
    const detachedReplay = await ledger.record({
      ownerId: ownerA,
      idempotencyKey: 'community:canonical:post:001',
      kind: 'community.contribution_created',
      sourceRef: `community:post:${postA}`,
    });
    assert.equal(detachedReplay.status, 'duplicate');
    assert.equal(detachedReplay.entry.id, postResult.entry.id);
  } finally {
    await sql`DELETE FROM world_progression_events WHERE owner_id IN (${ownerA}, ${ownerB})`;
    await sql`DELETE FROM community_events WHERE id = ${eventA}`;
    await sql`DELETE FROM posts WHERE id IN (${postA}, ${postB})`;
    await sql`DELETE FROM communities WHERE id = ${communityId}`;
    await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
  }
});
