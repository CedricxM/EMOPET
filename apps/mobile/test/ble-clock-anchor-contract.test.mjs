import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/services/ble-clock-anchor.ts', import.meta.url),
  'utf8',
);

test('mobile BOOT_ANCHOR wrapper delegates timing math and owns correlation/session binding', () => {
  assert.match(source, /computeBootAnchorTiming/);
  assert.match(source, /CLOCK_ANCHOR_NONCE_MISMATCH/);
  assert.match(source, /CLOCK_SAMPLE_BOOT_MISMATCH/);
  assert.match(source, /response\.requestNonce !== requestNonce/);
  assert.match(source, /response\.bootSessionId !== expectedBootSessionId/);
  assert.match(source, /localWallClockUncertaintyMs/);
  assert.match(source, /new Date\(timing\.anchorUtcMs\)/);
  assert.doesNotMatch(source, /roundTripMs = wallAfterUtcMs - wallBeforeUtcMs/);
});
