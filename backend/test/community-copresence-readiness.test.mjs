import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const route = readFileSync(new URL('../api/routes/community.ts', import.meta.url), 'utf8');

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

test('copresence read keeps dog ownership authorization before maturity failure', () => {
  const handler = copresenceHandlerSource();
  const ownership = handler.indexOf('requireDogOwnership(c, dogId)');
  const readiness = handler.indexOf("persistenceUnavailable(c, 'read_copresence')");
  assert.ok(ownership >= 0);
  assert.ok(readiness > ownership);
});

test('copresence remains fail closed while matching/location runtime is unavailable', () => {
  const handler = copresenceHandlerSource();
  const helper = functionSource('persistenceUnavailable');
  assert.match(helper, /code:\s*COMMUNITY_PERSISTENCE_CODE/);
  assert.match(helper, /retryable:\s*false/);
  assert.match(helper, /},\s*503\)/);
  assert.match(helper, /private, no-store/);
  assert.doesNotMatch(handler, /matches:\s*\[\]/);
});
