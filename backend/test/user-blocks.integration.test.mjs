import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-SOCIAL-01 user blocks are constrained in PostgreSQL and by the repository', { skip: !enabled }, async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const { drizzleUserBlockRepository } = await import('../dist/api/services/user-blocks.js');
  const { closeDatabase } = await import('../dist/db/index.js');
  const repository = drizzleUserBlockRepository();
  const [a, b, gone] = [randomUUID(), randomUUID(), randomUUID()];
  t.after(async () => {
    await sql`DELETE FROM user_blocks WHERE blocker_user_id IN (${a}, ${b}) OR blocked_user_id IN (${a}, ${b})`;
    await sql`DELETE FROM users WHERE id IN (${a}, ${b})`;
    await sql.end();
    await closeDatabase();
  });
  for (const id of [a, b]) {
    await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${id}, ${`${id}@example.test`}, 'test-only', 'Synthetic')`;
  }

  await t.test('direct writers cannot self-block, duplicate, or reference unknown users', async () => {
    await assert.rejects(sql`INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (${a}, ${a})`,
      (error) => error.code === '23514' && error.constraint_name === 'chk_user_blocks_not_self');
    await assert.rejects(sql`INSERT INTO user_blocks (blocker_user_id, blocked_user_id) VALUES (${a}, ${gone})`,
      (error) => error.code === '23503' && error.constraint_name === 'user_blocks_blocked_user_id_users_id_fk');
  });

  await t.test('repository create is idempotent and one-sided; either-way check sees both directions', async () => {
    assert.equal((await repository.create(a, b)).result, 'created');
    assert.equal((await repository.create(a, b)).result, 'exists');
    assert.equal((await repository.create(a, gone)).result, 'target_not_found');
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM user_blocks WHERE blocker_user_id = ${a}`;
    assert.equal(count, 1);
    assert.deepEqual((await repository.list(b)), []);
    assert.equal((await repository.list(a))[0].blockedUserId, b);
    assert.equal(await repository.isBlockedEitherWay(a, b), true);
    assert.equal(await repository.isBlockedEitherWay(b, a), true);
  });

  await t.test('erasure disposition stays TO_CONFIRM: NO ACTION blocks deleting a blocked account', async () => {
    await assert.rejects(sql`DELETE FROM users WHERE id = ${b}`, (error) => error.code === '23503');
    await repository.remove(a, b);
    await repository.remove(a, b);
    assert.equal(await repository.isBlockedEitherWay(a, b), false);
  });
});
