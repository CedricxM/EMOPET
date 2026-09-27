import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/services/ble-clock-anchor.ts', import.meta.url),
  'utf8',
);

test('BOOT_ANCHOR math separates monotonic RTT from wall-clock UTC', () => {
  assert.match(source, /monotonicAfterMs - monotonicBeforeMs/);
  assert.match(source, /wallAfterUtcMs - wallBeforeUtcMs/);
  assert.match(source, /Math\.abs\(wallElapsedMs - roundTripMs\)/);
  assert.match(source, /WALL_CLOCK_DISCONTINUITY/);
  assert.match(source, /localWallClockUncertaintyMs/);
  assert.match(source, /CLOCK_ANCHOR_NONCE_MISMATCH/);
  assert.match(source, /CLOCK_SAMPLE_BOOT_MISMATCH/);
  assert.match(source, /wallBeforeUtcMs \+ Math\.floor\(roundTripMs \/ 2\)/);
  assert.doesNotMatch(source, /roundTripMs = wallAfterUtcMs - wallBeforeUtcMs/);
  assert.doesNotMatch(source, /anchorUtc:\s*new Date\(wallAfterUtcMs\)/);
});
