import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Hono community content routes do not acknowledge unpersisted creations', () => {
  const source = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

  assert.match(source, /community_post_persistence_not_implemented[\s\S]*?},\s*501\s*\);/);
  assert.match(source, /community_comment_persistence_not_implemented[\s\S]*?},\s*501\s*\);/);
  assert.match(source, /community_event_persistence_not_implemented[\s\S]*?},\s*501\s*\);/);

  assert.doesNotMatch(source, /message:\s*['"]posted['"]/);
  assert.doesNotMatch(source, /message:\s*['"]commented['"]/);
  assert.doesNotMatch(source, /message:\s*['"]event_created['"]/);
});
