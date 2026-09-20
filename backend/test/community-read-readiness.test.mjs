import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

test('durable Community reads use database authority while copresence remains fail closed', () => {
  assert.match(route, /withCommunityTransaction\(c, 'list_communities'/);
  assert.match(route, /withCommunityTransaction\(c, 'get_community'/);
  assert.match(route, /withCommunityTransaction\(c, 'read_feed'/);
  assert.match(route, /withCommunityTransaction\(c, 'list_events'/);

  assert.match(route, /requireCommunityMembership/);
  assert.match(route, /requireCurrentRulesAcceptance/);
  assert.match(route, /communityPersistenceUnavailable\(c, 'read_copresence'\)/);

  assert.doesNotMatch(route, /communities:\s*\[\]/);
  assert.doesNotMatch(route, /posts:\s*\[\]/);
  assert.doesNotMatch(route, /events:\s*\[\]/);
  assert.doesNotMatch(route, /matches:\s*\[\]/);
});
