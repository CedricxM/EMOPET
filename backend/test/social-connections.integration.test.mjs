import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-SOCIAL-02 connections follow the decided trust-ladder transitions in PostgreSQL', { skip: !enabled }, async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const {
    drizzleSocialConnectionRepository, drizzleWorldPresenceConsentRepository, orderedPair, SocialConnectionError,
  } = await import('../dist/api/services/social-connections.js');
  const { drizzleUserBlockRepository } = await import('../dist/api/services/user-blocks.js');
  const { closeDatabase } = await import('../dist/db/index.js');
  const connections = drizzleSocialConnectionRepository();
  const consents = drizzleWorldPresenceConsentRepository();
  const blocks = drizzleUserBlockRepository();
  const [a, b, c, gone] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const people = [a, b, c];
  t.after(async () => {
    await sql`DELETE FROM social_connections WHERE user_low_id IN ${sql(people)} OR user_high_id IN ${sql(people)}`;
    await sql`DELETE FROM user_blocks WHERE blocker_user_id IN ${sql(people)} OR blocked_user_id IN ${sql(people)}`;
    await sql`DELETE FROM world_presence_consents WHERE user_id IN ${sql(people)}`;
    await sql`DELETE FROM users WHERE id IN ${sql(people)}`;
    await sql.end();
    await closeDatabase();
  });
  for (const id of people) {
    await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${id}, ${`${id}@example.test`}, 'test-only', 'Synthetic')`;
  }
  const row = async (x, y) => {
    const { low, high } = orderedPair(x, y);
    const [found] = await sql`SELECT * FROM social_connections WHERE user_low_id = ${low} AND user_high_id = ${high}`;
    return found;
  };

  await t.test('PostgreSQL refuses unordered pairs, unknown states, trust without connection', async () => {
    const { low, high } = orderedPair(a, b);
    await assert.rejects(sql`INSERT INTO social_connections (user_low_id, user_high_id, status, requested_by_low) VALUES (${high}, ${low}, 'PENDING', true)`,
      (error) => error.code === '23514' && error.constraint_name === 'chk_social_connections_ordered_pair');
    await assert.rejects(sql`INSERT INTO social_connections (user_low_id, user_high_id, status, requested_by_low) VALUES (${low}, ${high}, 'FRIENDS', true)`,
      (error) => error.code === '23514' && error.constraint_name === 'chk_social_connections_status');
    await assert.rejects(sql`INSERT INTO social_connections (user_low_id, user_high_id, status, requested_by_low, low_trusts_high) VALUES (${low}, ${high}, 'PENDING', true, true)`,
      (error) => error.code === '23514' && error.constraint_name === 'chk_social_connections_trust_requires_connection');
  });

  await t.test('request + acceptance connects; unknown users look not found', async () => {
    assert.equal(await connections.request(a, gone), 'target_not_found');
    assert.throws(() => orderedPair(a, a), SocialConnectionError);
    assert.equal(await connections.request(a, b), 'pending');
    assert.equal(await connections.request(a, b), 'pending', 'idempotent');
    assert.deepEqual((await connections.list(b)).incoming.map((x) => x.userId), [a]);
    assert.deepEqual((await connections.list(a)).outgoing.map((x) => x.userId), [b]);
    assert.equal(await connections.accept(a, b), 'not_found', 'the requester cannot accept their own request');
    assert.equal(await connections.accept(b, a), 'connected');
    assert.equal(await connections.trustState(a, b), 'CONNECTED');
    assert.equal(await connections.isMutuallyConnected(b, a), true);
    assert.deepEqual(await connections.connectedPeers(a), [b]);
  });

  await t.test('TRUSTED is directional, user-granted, invisible to the other, and requires CONNECTED', async () => {
    assert.equal(await connections.setTrust(a, b, true), 'ok');
    assert.equal(await connections.trustState(a, b), 'TRUSTED');
    assert.equal(await connections.trustState(b, a), 'CONNECTED', 'the other person does not gain trust');
    assert.deepEqual((await connections.list(b)).connections.map((x) => x.state), ['CONNECTED'], 'nobody learns they are trusted');
    assert.equal(await connections.setTrust(a, c, true), 'not_connected');
  });

  await t.test('removing a connection is one action, and either person may ask again afterwards', async () => {
    await connections.remove(b, a);
    assert.equal(await row(a, b), undefined);
    assert.equal(await connections.trustState(a, b), 'STRANGER');
    assert.equal(await connections.request(b, a), 'pending');
    assert.equal(await connections.request(a, b), 'connected', 'a mutual request connects at once');
  });

  await t.test('a decline is silent, the declined person cannot ask again, only the decliner can reopen', async () => {
    assert.equal(await connections.request(a, c), 'pending');
    await connections.decline(c, a);
    assert.equal((await row(a, c)).status, 'DECLINED');
    assert.deepEqual((await connections.list(a)).outgoing.map((x) => x.userId), [c], 'still looks pending to the requester');
    assert.deepEqual((await connections.list(c)).incoming, [], 'gone for the decliner');
    assert.equal(await connections.request(a, c), 'pending', 'same answer as pending');
    assert.equal((await row(a, c)).status, 'DECLINED', 'but nothing changed');
    await connections.cancel(a, c);
    assert.equal((await row(a, c)).status, 'DECLINED', 'cancelling cannot erase a decline');
    assert.equal(await connections.request(c, a), 'pending', 'the decliner reopens');
    assert.deepEqual((await connections.list(a)).incoming.map((x) => x.userId), [c]);
    assert.equal(await connections.accept(a, c), 'connected');
  });

  await t.test('a block dissolves connections and pending requests, keeps declines, restores nothing', async () => {
    assert.equal(await connections.setTrust(a, b, true), 'ok');
    assert.equal((await blocks.create(b, a)).result, 'created');
    assert.equal(await row(a, b), undefined, 'connection and TRUSTED grant deleted');
    assert.equal(await connections.trustState(a, b), 'BLOCKED');
    assert.equal(await connections.request(a, b), 'target_not_found', 'blocked looks unknown');
    assert.equal(await connections.request(b, a), 'target_not_found', 'either way');
    await blocks.remove(b, a);
    assert.equal(await connections.trustState(a, b), 'STRANGER', 'unblocking restores nothing');
    await connections.remove(a, c);
    assert.equal(await connections.request(c, a), 'pending');
    await connections.decline(a, c);
    assert.equal((await blocks.create(a, c)).result, 'created');
    assert.equal((await row(a, c)).status, 'DECLINED', 'a decline protects the decliner and survives');
    await blocks.remove(a, c);
  });

  await t.test('presence consent: per session, capped, withdrawable', async () => {
    const now = new Date();
    assert.equal(await consents.isActive(a, now), false, 'invisible by default');
    await assert.rejects(consents.grant(a, new Date(now.getTime() - 1), now), SocialConnectionError);
    await consents.grant(a, new Date(now.getTime() + 7 * 86_400_000), now);
    const [record] = await sql`SELECT expires_at FROM world_presence_consents WHERE user_id = ${a}`;
    assert.ok(new Date(record.expires_at).getTime() <= now.getTime() + 86_400_000, 'capped at 24 hours');
    assert.equal(await consents.isActive(a, now), true);
    await consents.withdraw(a, now);
    assert.equal(await consents.isActive(a, now), false);
    await consents.grant(a, new Date(now.getTime() + 60_000), now);
    assert.equal(await consents.isActive(a, new Date(now.getTime() + 61_000)), false, 'expires with the session');
  });

  await t.test('erasure disposition stays TO_CONFIRM: NO ACTION blocks deleting a connected account', async () => {
    assert.equal(await connections.request(b, c), 'pending');
    await assert.rejects(sql`DELETE FROM users WHERE id = ${c}`, (error) => error.code === '23503');
  });
});
