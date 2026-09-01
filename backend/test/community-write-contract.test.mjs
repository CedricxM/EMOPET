import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Hono community UGC routes do not acknowledge unpersisted writes', () => {
  const source = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

  assert.match(source, /community_post_persistence_not_implemented/);
  assert.match(source, /community_comment_persistence_not_implemented/);
  assert.match(source, /community_event_persistence_not_implemented/);

  assert.doesNotMatch(source, /message:\s*['"]posted['"]/);
  assert.doesNotMatch(source, /message:\s*['"]commented['"]/);
  assert.doesNotMatch(source, /message:\s*['"]event_created['"]/);

  const notImplementedResponses = source.match(/},\s*501\s*\);/g) ?? [];
  assert.ok(notImplementedResponses.length >= 3);
});
