import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');
const docs = readFileSync(new URL('../../docs/user_manual/api_reference.md', import.meta.url), 'utf8');

function functionSource(name) {
  const start = route.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const end = route.indexOf('\n}', start);
  assert.ok(end > start, `function ${name} must terminate`);
  return route.slice(start, end + 2);
}

function copresenceHandlerSource() {
  const start = route.indexOf("community.get('/copresence/:dogId'");
  assert.ok(start >= 0, 'copresence route must exist');
  const end = route.indexOf('\n});', start);
  assert.ok(end > start, 'copresence handler must terminate');
  return route.slice(start, end + 4);
}

test('copresence read keeps dog ownership authorization before runtime readiness', () => {
  const handler = copresenceHandlerSource();
  const ownership = handler.indexOf('requireDogOwnership(c, dogId)');
  const readiness = handler.indexOf("communityPersistenceUnavailable(c, 'read_copresence')");

  assert.ok(ownership >= 0, 'copresence read must require dog ownership');
  assert.ok(readiness > ownership, 'runtime readiness failure must happen only after ownership authorization');
});

test('shared Community readiness helper fails closed while matching runtime is unavailable', () => {
  const handler = copresenceHandlerSource();
  const helper = functionSource('communityPersistenceUnavailable');

  assert.match(handler, /communityPersistenceUnavailable\(c, 'read_copresence'\)/);
  assert.match(helper, /code:\s*COMMUNITY_PERSISTENCE_NOT_READY/);
  assert.match(helper, /retryable:\s*false/);
  assert.match(helper, /},\s*503\)/);
  assert.match(helper, /Cache-Control',\s*'private, no-store'/);
  assert.doesNotMatch(handler, /matches:\s*\[\]/);
});

test('API reference does not describe copresence as a successful empty placeholder', () => {
  assert.match(
    docs,
    /\/api\/community\/copresence\/:dogId[^\n]*503 COMMUNITY_PERSISTENCE_NOT_READY/,
  );
  assert.doesNotMatch(
    docs,
    /\/api\/community\/copresence\/:dogId[^\n]*résultats placeholder/,
  );
});
