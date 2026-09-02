import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sensorsSource = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');
const mobileHookSource = readFileSync(new URL('../../apps/mobile/src/hooks/use-v6-insights.ts', import.meta.url), 'utf8');

test('ELI backend reads fail honestly while no authoritative runtime exists', () => {
  const occurrences = sensorsSource.match(/eli_runtime_not_implemented/g) ?? [];
  assert.equal(occurrences.length, 2);
  assert.doesNotMatch(sensorsSource, /return c\.json\(\{ dogId, eli: null \}\)/);
  assert.doesNotMatch(sensorsSource, /return c\.json\(\{ dogId, range, history: \[\] \}\)/);
});

test('mobile v6 insights do not name a phantom endpoint or claim authority', () => {
  assert.doesNotMatch(mobileHookSource, /\/api\/eli\/latest/);
  assert.match(mobileHookSource, /status:\s*['"]UNWIRED['"]/);
  assert.match(mobileHookSource, /authoritative:\s*false/);
  assert.match(mobileHookSource, /endpoint:\s*null/);
});
