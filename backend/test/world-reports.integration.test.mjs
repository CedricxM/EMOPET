import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const enabled = process.env.EMOPET_DB_INTEGRATION_TEST === '1';

test('WORLD-SOCIAL-01 world reports share the moderation queue under PostgreSQL constraints', { skip: !enabled }, async (t) => {
  const { default: postgres } = await import('postgres');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const { drizzleWorldReportSink } = await import('../dist/api/services/world-reports.js');
  const { closeDatabase } = await import('../dist/db/index.js');
  const sink = drizzleWorldReportSink();
  const [reporter, subject, gone, message] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  t.after(async () => {
    await sql`DELETE FROM community_reports WHERE reporter_user_id IN (${reporter}, ${subject}) OR subject_user_id IN (${reporter}, ${subject})`;
    await sql`DELETE FROM users WHERE id IN (${reporter}, ${subject})`;
    await sql.end();
    await closeDatabase();
  });
  for (const id of [reporter, subject]) {
    await sql`INSERT INTO users (id, email, password_hash, name) VALUES (${id}, ${`${id}@example.test`}, 'test-only', 'Synthetic')`;
  }

  await t.test('sink writes world_user and world_message reports with the right shape', async () => {
    const user = await sink.create({ reporterUserId: reporter, subjectUserId: subject, kind: 'world_user', reason: 'harassment' });
    const msg = await sink.create({ reporterUserId: reporter, subjectUserId: subject, kind: 'world_message', messageId: message, reason: 'spam', details: 'repeated' });
    assert.equal(user.status, 'open');
    const rows = await sql`SELECT id, content_type, content_id, community_id, subject_user_id, details FROM community_reports WHERE reporter_user_id = ${reporter} ORDER BY content_type`;
    assert.deepEqual(rows.map((r) => [r.content_type, r.content_id, r.community_id, r.subject_user_id]), [
      ['world_message', message, null, subject],
      ['world_user', null, null, subject],
    ]);
    assert.equal(rows.find((r) => r.id === msg.id).details, 'repeated');
    await assert.rejects(sink.create({ reporterUserId: reporter, subjectUserId: gone, kind: 'world_user', reason: 'spam' }), /subject_not_found/);
  });

  await t.test('direct writers cannot break the target shape or self-report', async () => {
    const shape = (error) => error.code === '23514' && error.constraint_name === 'chk_community_reports_target_shape';
    await assert.rejects(sql`INSERT INTO community_reports (reporter_user_id, content_type, content_id, subject_user_id, reason) VALUES (${reporter}, 'world_user', ${randomUUID()}, ${subject}, 'spam')`, shape);
    await assert.rejects(sql`INSERT INTO community_reports (reporter_user_id, content_type, subject_user_id, reason) VALUES (${reporter}, 'world_message', ${subject}, 'spam')`, shape);
    await assert.rejects(sql`INSERT INTO community_reports (reporter_user_id, content_type, content_id, community_id, subject_user_id, reason)
      VALUES (${reporter}, 'post', ${randomUUID()}, ${randomUUID()}, ${subject}, 'spam')`, shape);
    await assert.rejects(sql`INSERT INTO community_reports (reporter_user_id, content_type, reason) VALUES (${reporter}, 'post', 'spam')`, shape);
    await assert.rejects(sql`INSERT INTO community_reports (reporter_user_id, content_type, subject_user_id, reason) VALUES (${reporter}, 'world_user', ${reporter}, 'spam')`,
      (error) => error.code === '23514' && error.constraint_name === 'chk_community_reports_not_self');
  });

  await t.test('reported-person erasure detaches the subject and keeps the report (decision #594)', async () => {
    const before = await sql`SELECT count(*)::int AS n FROM community_reports WHERE subject_user_id = ${subject}`;
    assert.equal(before[0].n, 2);
    await sql`DELETE FROM users WHERE id = ${subject}`;
    const after = await sql`SELECT content_type, subject_user_id FROM community_reports WHERE reporter_user_id = ${reporter} ORDER BY content_type`;
    assert.deepEqual(after.map((r) => [r.content_type, r.subject_user_id]), [['world_message', null], ['world_user', null]]);
  });
});
