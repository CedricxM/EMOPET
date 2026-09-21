import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('approved D1-D4 privacy decisions are recorded while legal/privacy acceptance stays unresolved', async () => {
  const semantics = JSON.parse(await source('config/privacy/erasure-conditional-semantics.json'));
  assert.equal(semantics.summary.productPrivacyDecisionsApproved, 4);
  assert.equal(semantics.summary.authorityDecisionsStillRequired, 1);
  assert.equal(semantics.productPrivacyDecisionsApproved.length, 4);
  assert.deepEqual(
    semantics.authorityDecisionsRemaining.map((row) => row.relation),
    ['users.id|DIRECT_FK|community_rules_acceptances|user_id'],
  );
  for (const row of semantics.productPrivacyDecisionsApproved) {
    assert.equal(row.promotionAuthorized, true);
    assert.equal(row.executionStatus, 'NOT_IMPLEMENTED');
  }
});

test('D1-D4 identity foreign keys detach rather than block account-root deletion', async () => {
  const [behavioral, community, migration] = await Promise.all([
    source('backend/db/schema/behavioral-assessments.ts'),
    source('backend/db/schema/community.ts'),
    source('backend/db/migrations/0006_privacy_detachable_provenance.sql'),
  ]);

  assert.match(behavioral, /respondentUserId: uuid\('respondent_user_id'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(community, /createdBy: uuid\('created_by'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(community, /reporterUserId: uuid\('reporter_user_id'\)\.references\(\(\) => users\.id, \{ onDelete: 'set null' \}\)/);
  assert.match(migration, /behavioral_assessments[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /communities[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /community_events[\s\S]*ON DELETE SET NULL/);
  assert.match(migration, /community_reports[\s\S]*ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /ALTER TABLE "community_rules_acceptances"/);
  assert.doesNotMatch(migration, /ALTER TABLE "research_data_consents"/);
  assert.doesNotMatch(migration, /ALTER TABLE "subscriptions"/);
});
