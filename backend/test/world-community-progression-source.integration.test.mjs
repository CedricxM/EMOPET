import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
const runtimeTest = databaseUrl ? test : test.skip;

runtimeTest('Community contribution source verifier proves canonical Owner authorship from PostgreSQL only', async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(databaseUrl, { max: 1 });
  const {
    drizzleCommunityContributionSourceVerifier,
    parseCommunityContributionSourceRef,
  } = await import('../dist/api/services/world-community-progression-source.js');
  const { closeDatabase } = await import('../dist/db/index.js');

  const ownerA = randomUUID();
  const ownerB = randomUUID();
  const communityId = randomUUID();
  const postA = randomUUID();
  const postB = randomUUID();
  const eventA = randomUUID();

  t.after(async () => {
    await sql`DELETE FROM community_events WHERE id = ${eventA}`;
    await sql`DELETE FROM posts WHERE id IN (${postA}, ${postB})`;
    await sql`DELETE FROM communities WHERE id = ${communityId}`;
    await sql`DELETE FROM users WHERE id IN (${ownerA}, ${ownerB})`;
    await sql.end();
    await closeDatabase();
  });

  for (const ownerId of [ownerA, ownerB]) {
    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (
        ${ownerId},
        ${`world-community-source-${ownerId}@example.test`},
        'test-only',
        'Synthetic Owner'
      )
    `;
  }

  await sql`
    INSERT INTO communities (id, name, type, created_by)
    VALUES (${communityId}, 'Canonical Community', 'activity', ${ownerA})
  `;

  await sql`
    INSERT INTO posts (id, community_id, author_id, type, content, sensor_overlay)
    VALUES
      (${postA}, ${communityId}, ${ownerA}, 'discussion', 'Owner A post', ${sql.json({ ignoredForProgression: true })}),
      (${postB}, ${communityId}, ${ownerB}, 'discussion', 'Owner B post', null)
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
      'Location and description must never become progression evidence',
      'Precise event location',
      48.8,
      2.1,
      ${new Date('2026-10-20T18:00:00.000Z')}
    )
  `;

  const verifier = drizzleCommunityContributionSourceVerifier();

  await t.test('post source resolves only for its exact canonical author', async () => {
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
        sourceRef: `community:post:${postB}`,
      }),
      false,
    );
  });

  await t.test('event source resolves only for its exact canonical creator', async () => {
    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'community.contribution_created',
        sourceRef: `community:event:${eventA}`,
      }),
      true,
    );
    assert.equal(
      await verifier({
        ownerId: ownerB,
        kind: 'community.contribution_created',
        sourceRef: `community:event:${eventA}`,
      }),
      false,
    );
  });

  await t.test('unsupported source shapes and wrong event kind fail closed', async () => {
    for (const sourceRef of [
      `community:comment:${randomUUID()}`,
      'community:post:not-a-uuid',
      `community:membership:${randomUUID()}`,
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

    assert.equal(
      await verifier({
        ownerId: ownerA,
        kind: 'knowledge.card_read',
        sourceRef: `community:post:${postA}`,
      }),
      false,
    );
  });

  await t.test('detached author/creator no longer authorizes progression', async () => {
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
  });

  await t.test('parser normalizes UUID case but exposes no Community payload', () => {
    const parsed = parseCommunityContributionSourceRef(
      `community:post:${postB.toUpperCase()}`,
    );
    assert.deepEqual(parsed, {
      type: 'post',
      id: postB,
    });
    assert.equal(Object.hasOwn(parsed, 'content'), false);
    assert.equal(Object.hasOwn(parsed, 'location'), false);
    assert.equal(Object.hasOwn(parsed, 'sensorOverlay'), false);
  });
});
