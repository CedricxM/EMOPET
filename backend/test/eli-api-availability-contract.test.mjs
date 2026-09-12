import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sensorsSourceUrl = new URL('../api/routes/sensors.ts', import.meta.url);
const mobileHookUrl = new URL('../../apps/mobile/src/hooks/use-v6-insights.ts', import.meta.url);

test('ELI latest/history routes fail honestly after ownership while runtime is unwired', async () => {
  const source = await readFile(sensorsSourceUrl, 'utf8');

  assert.match(source, /const ELI_RUNTIME_NOT_IMPLEMENTED = 'ELI_RUNTIME_NOT_IMPLEMENTED'/);
  assert.match(source, /sensors\.get\('\/eli\/:dogId',[\s\S]*?requireDogOwnership\(c, dogId\)[\s\S]*?eliRuntimeUnavailable\(c, dogId, 'get_latest_eli_state'\)/);
  assert.match(source, /sensors\.get\('\/eli\/:dogId\/history',[\s\S]*?requireDogOwnership\(c, dogId\)[\s\S]*?eliRuntimeUnavailable\(c, dogId, 'list_eli_history'\)/);
  assert.doesNotMatch(source, /from\(eliStates\)/);
  assert.doesNotMatch(source, /eli:\s*latest\s*\?\?\s*null/);
  assert.doesNotMatch(source, /history:\s*history/);
  assert.match(source, /Cache-Control', 'private, no-store'/);
});

test('mobile v6 hook names no phantom endpoint and remains explicitly non-authoritative', async () => {
  const source = await readFile(mobileHookUrl, 'utf8');

  assert.doesNotMatch(source, /\/api\/eli\/latest/);
  assert.match(source, /V6_INSIGHTS_RUNTIME_SOURCE/);
  assert.match(source, /status:\s*'UNWIRED'/);
  assert.match(source, /authoritative:\s*false/);
  assert.match(source, /endpoint:\s*null/);
  assert.match(source, /setInsights\(EMPTY\)/);
});
