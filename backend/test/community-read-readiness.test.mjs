import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');
const docs = readFileSync(new URL('../../docs/user_manual/api_reference.md', import.meta.url), 'utf8');

test('durable Community read surfaces use PostgreSQL authority instead of synthetic maturity responses', () => {
  for (const routeNeedle of [
    "community.get('/',",
    "community.get('/:id',",
    "community.get('/:id/feed',",
    "community.get('/:id/events',",
  ]) {
    const start = route.indexOf(routeNeedle);
    assert.ok(start >= 0, `missing ${routeNeedle}`);
    const end = route.indexOf('\n});', start);
    const handler = route.slice(start, end + 4);
    assert.match(handler, /withCommunityTransaction/);
    assert.doesNotMatch(handler, /persistenceUnavailable/);
  }
});

test('block and copresence surfaces remain explicitly fail closed', () => {
  assert.match(route, /community\.post\('\/blocks'[\s\S]*persistenceUnavailable\(c, 'create_block'\)/);
  assert.match(route, /community\.get\('\/copresence\/:dogId'[\s\S]*requireDogOwnership\(c, dogId\)[\s\S]*persistenceUnavailable\(c, 'read_copresence'\)/);
});

test('API reference reflects durable core without claiming blocking or copresence runtime', () => {
  assert.match(docs, /\/api\/community[^\n]*PostgreSQL/);
  assert.match(docs, /\/api\/community\/blocks[^\n]*503 COMMUNITY_PERSISTENCE_NOT_READY/);
  assert.match(docs, /\/api\/community\/copresence\/:dogId[^\n]*503 COMMUNITY_PERSISTENCE_NOT_READY/);
});
