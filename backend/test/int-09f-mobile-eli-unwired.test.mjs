import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mobileHookSource = readFileSync(
  new URL('../../apps/mobile/src/hooks/use-v6-insights.ts', import.meta.url),
  'utf8',
);

test('INT-09F mobile v6 insights remain explicitly unwired and non-authoritative', () => {
  assert.doesNotMatch(mobileHookSource, /\/api\/eli\/latest/);
  assert.match(mobileHookSource, /status:\s*['"]UNWIRED['"]/);
  assert.match(mobileHookSource, /authoritative:\s*false/);
  assert.match(mobileHookSource, /endpoint:\s*null/);
});

test('INT-09F mobile v6 insights do not substitute local or mock inference', () => {
  assert.match(
    mobileHookSource,
    /do not invent an endpoint or substitute locally computed values/,
  );
  assert.doesNotMatch(mobileHookSource, /TanStack Query call against/);
});
