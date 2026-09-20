import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../../apps/mobile/src/services/feature-progress.ts', import.meta.url),
  'utf8',
);

test('INT-09E3 unproven Community readiness is never hard-coded done', () => {
  const literalDone = source.match(/state:\s*['"]done['"]/g) ?? [];
  assert.equal(
    literalDone.length,
    0,
    'no hard-coded readiness guard may be published as done without authority',
  );

  const reportBlocks = source.match(
    /key:\s*['"]report_block['"][\s\S]{0,160}?state:\s*['"]blocked['"]/g,
  ) ?? [];
  assert.equal(reportBlocks.length, 3);
});

test('INT-09E3 user-derived progress can still become done dynamically', () => {
  for (const marker of [
    "communityOptIn ? 'done' : 'todo'",
    "communityRulesAccepted ? 'done' : 'todo'",
    "isWaitlisted ? 'done' : 'todo'",
    "locationTempOptIn ? 'done' : 'todo'",
  ]) {
    assert.ok(source.includes(marker), 'missing dynamic progress marker: ' + marker);
  }
});
