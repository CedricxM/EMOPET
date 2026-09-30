import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-SOCIAL-03 pilot access is canonical, adult-declared, revocable and tied to a live login', { skip: !enabled }, async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const { drizzleWorldPilotAccess, WorldPilotAccessError } = await import('../dist/api/services/world-pilot-access.js');
  const { onActorRevoked } = await import('../dist/api/services/actor-revocation.js');
  const { closeDatabase } = await import('../dist/db/index.js');
  const access = drizzleWorldPilotAccess();
  const [tester, stranger, gone] = [randomUUID(), randomUUID(), randomUUID()];
  const revoked = [];
  const off = onActorRevoked((userId, reason) => { revoked.push([userId, reason]); });
  const now = new Date();
  const declared = new Date(now.getTime() - 60_000);
  t.after(async () => {
    off();
    await sql`DELETE FROM world_pilot_access WHERE user_id IN (${tester}, ${stranger})`;
    await sql`DELETE FROM auth_refresh_sessions WHERE user_id IN (${tester}, ${stranger})`;
    await sql`DELETE FROM users WHERE id IN (${tester}, ${stranger})`;
    await sql.end();
    await closeDatabase();
  });
  for (const id of [tester, stranger]) {
    await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${id}, ${`${id}@example.test`}, 'test-only', 'Synthetic')`;
  }
  const liveLogin = async (userId) => {
    await sql`INSERT INTO auth_refresh_sessions (id, user_id, family_id, token_hash, expires_at)
      VALUES (${randomUUID()}, ${userId}, ${randomUUID()}, ${randomUUID()}, ${new Date(now.getTime() + 3_600_000)})`;
  };

  await t.test('PostgreSQL refuses a grant without prior adulthood declaration or for an unknown account', async () => {
    await assert.rejects(sql`INSERT INTO world_pilot_access (user_id, adult_self_declared_at, granted_at)
      VALUES (${tester}, ${new Date(now.getTime() + 60_000)}, ${now})`,
    (error) => error.code === '23514' && error.constraint_name === 'chk_world_pilot_access_declared_before_grant');
    await assert.rejects(sql`INSERT INTO world_pilot_access (user_id, adult_self_declared_at) VALUES (${gone}, ${declared})`,
      (error) => error.code === '23503' && error.constraint_name === 'world_pilot_access_user_id_users_id_fk');
    await assert.rejects(access.grant(tester, new Date(Number.NaN), now), WorldPilotAccessError);
    assert.equal(await access.grant(gone, declared, now), 'user_not_found');
  });

  await t.test('eligible only with a grant AND a live login; unflagged accounts are refused', async () => {
    assert.equal(await access.grant(tester, declared, now), 'granted');
    assert.equal(await access.isEligible(tester, now), false, 'no live login yet');
    await liveLogin(tester);
    await liveLogin(stranger);
    assert.equal(await access.isEligible(tester, now), true);
    assert.equal(await access.isEligible(stranger, now), false, 'no pilot grant');
    assert.deepEqual((await access.listActive()).filter((row) => row.userId === tester).length, 1);
  });

  await t.test('logout_all makes a still-valid access JWT useless for World: no live login remains', async () => {
    await sql`UPDATE auth_refresh_sessions SET revoked_at = ${now}, revoke_reason = 'logout_all' WHERE user_id = ${tester}`;
    assert.equal(await access.isEligible(tester, now), false);
    await liveLogin(tester);
    assert.equal(await access.isEligible(tester, now), true);
  });

  await t.test('revocation is immediate, keeps the row, notifies surfaces, and a re-grant is explicit', async () => {
    assert.equal(await access.revoke(tester, now), true);
    assert.deepEqual(revoked.filter(([id]) => id === tester), [[tester, 'world_access_revoked']]);
    assert.equal(await access.isEligible(tester, now), false);
    const [row] = await sql`SELECT revoked_at FROM world_pilot_access WHERE user_id = ${tester}`;
    assert.ok(row.revoked_at);
    assert.equal(await access.revoke(tester, now), false, 'already revoked');
    assert.equal(await access.grant(tester, declared, now), 'granted');
    assert.equal(await access.isEligible(tester, now), true);
  });

  await t.test('erasure disposition stays TO_CONFIRM: NO ACTION blocks deleting a flagged account', async () => {
    await sql`DELETE FROM auth_refresh_sessions WHERE user_id = ${tester}`;
    await assert.rejects(sql`DELETE FROM users WHERE id = ${tester}`, (error) => error.code === '23503');
  });
});
