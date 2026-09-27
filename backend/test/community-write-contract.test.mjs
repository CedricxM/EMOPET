import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Hono Community core acknowledges only durable writes and routes blocks to the canonical store', () => {
  const source = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

  for (const persisted of [
    '.insert(communityRulesAcceptances)',
    '.insert(communityReports)',
    '.insert(posts)',
    '.insert(comments)',
    '.insert(communityEvents)',
  ]) {
    assert.ok(source.includes(persisted), `missing durable write: ${persisted}`);
  }

  assert.doesNotMatch(source, /communityPersistenceUnavailable\(c, 'create_block'\)/);
  assert.match(source, /blockRepository\.create\(actor, target\)/);
  assert.match(source, /reasonStored: false/);
  assert.doesNotMatch(source, /community_post_persistence_not_implemented/);
  assert.doesNotMatch(source, /community_comment_persistence_not_implemented/);
  assert.doesNotMatch(source, /community_event_persistence_not_implemented/);
  assert.doesNotMatch(source, /acceptCommunityRules|createUgcReport|createUserBlock/);
});
