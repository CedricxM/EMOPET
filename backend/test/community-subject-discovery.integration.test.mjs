import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const enabled = process.env.SUBJECT_DISCOVERY_DB_INTEGRATION === '1';
const USER = randomUUID();
const COMMUNITY = randomUUID();
const POST = randomUUID();
const COMMENT = randomUUID();
const EVENT = randomUUID();
const REPORT = randomUUID();

let sql = null;
let discoverSubjectData = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgresModule }, discoveryModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/services/subject-discovery.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgresModule(process.env.DATABASE_URL, { max: 1 });
  discoverSubjectData = discoveryModule.discoverSubjectData;
  closeDatabase = dbModule.closeDatabase;
}

after(async () => {
  if (sql) {
    await sql`DELETE FROM community_reports WHERE id = ${REPORT}`;
    await sql`DELETE FROM comments WHERE id = ${COMMENT}`;
    await sql`DELETE FROM posts WHERE id = ${POST}`;
    await sql`DELETE FROM community_events WHERE id = ${EVENT}`;
    await sql`DELETE FROM community_rules_acceptances WHERE user_id = ${USER}`;
    await sql`DELETE FROM community_members WHERE community_id = ${COMMUNITY}`;
    await sql`DELETE FROM communities WHERE id = ${COMMUNITY}`;
    await sql`DELETE FROM users WHERE id = ${USER}`;
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('subject discovery includes durable Community persistence after INT-06 composition', { skip: !enabled }, async () => {
  await sql`INSERT INTO users (id,email,password_hash,name) VALUES (${USER}, ${`community-discovery-${USER}@example.test`}, 'test-only', 'Community Discovery')`;
  await sql`INSERT INTO communities (id,name,type,created_by) VALUES (${COMMUNITY}, 'Discovery Community', 'activity', ${USER})`;
  await sql`INSERT INTO community_members (community_id,user_id,role) VALUES (${COMMUNITY}, ${USER}, 'member')`;
  await sql`INSERT INTO community_rules_acceptances (user_id,rules_version) VALUES (${USER}, 'community-rules-v1-candidate')`;
  await sql`INSERT INTO posts (id,community_id,author_id,type,content) VALUES (${POST}, ${COMMUNITY}, ${USER}, 'moment', 'discovery post')`;
  await sql`INSERT INTO comments (id,post_id,author_id,content) VALUES (${COMMENT}, ${POST}, ${USER}, 'discovery comment')`;
  await sql`INSERT INTO community_events (id,community_id,created_by,title,location,starts_at) VALUES (${EVENT}, ${COMMUNITY}, ${USER}, 'Discovery event', 'withheld', '2099-01-01')`;
  await sql`INSERT INTO community_reports (id,reporter_user_id,content_type,content_id,community_id,reason) VALUES (${REPORT}, ${USER}, 'post', ${POST}, ${COMMUNITY}, 'spam')`;

  const result = await discoverSubjectData(USER);
  assert.equal(result.ok, true);
  assert.equal(result.guardian.communitiesCreated.count, 1);
  assert.equal(result.guardian.communityMemberships.count, 1);
  assert.equal(result.guardian.communityPostsAuthored.count, 1);
  assert.equal(result.guardian.communityCommentsAuthored.count, 1);
  assert.equal(result.guardian.communityEventsCreated.count, 1);
  assert.equal(result.guardian.communityRulesAcceptances.count, 1);
  assert.equal(result.guardian.communityReportsFiled.count, 1);
  assert.equal(Object.hasOwn(result.externalOrUnresolved, 'community'), false);
});
