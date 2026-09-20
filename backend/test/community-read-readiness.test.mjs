import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');
const docs = readFileSync(new URL('../../docs/user_manual/api_reference.md', import.meta.url), 'utf8');

const expectedOperations = [
  ['community.get(\'/\'', 'list_communities'],
  ["community.get('/:id'", 'get_community'],
  ["community.get('/:id/feed'", 'read_feed'],
  ["community.get('/:id/events'", 'list_events'],
  ["community.get('/copresence/:dogId'", 'read_copresence'],
];

test('Community read surfaces fail closed instead of fabricating empty authoritative state', () => {
  assert.match(route, /function communityPersistenceUnavailable/);
  assert.match(route, /code:\s*COMMUNITY_PERSISTENCE_NOT_READY/);
  assert.match(route, /retryable:\s*false/);
  assert.match(route, /Cache-Control',\s*'private, no-store'/);

  for (const [needle, operation] of expectedOperations) {
    const start = route.indexOf(needle);
    assert.ok(start >= 0, `missing route ${needle}`);
    const end = route.indexOf('\n});', start);
    const handler = route.slice(start, end + 4);
    assert.match(handler, new RegExp(`communityPersistenceUnavailable\\(c, '${operation}'\\)`));
  }

  assert.doesNotMatch(route, /communities:\s*\[\]/);
  assert.doesNotMatch(route, /posts:\s*\[\]/);
  assert.doesNotMatch(route, /events:\s*\[\]/);
  assert.doesNotMatch(route, /matches:\s*\[\]/);
});

test('Community API reference labels unavailable reads instead of placeholders', () => {
  for (const path of [
    '/api/community`',
    '/api/community/:id`',
    '/api/community/:id/feed`',
    '/api/community/:id/events`',
    '/api/community/copresence/:dogId`',
  ]) {
    const row = docs.split('\n').find((line) => line.includes(path));
    assert.ok(row, `missing API reference row for ${path}`);
    assert.match(row, /503 COMMUNITY_PERSISTENCE_NOT_READY/);
    assert.doesNotMatch(row, /placeholder|Détail minimal/);
  }
});
