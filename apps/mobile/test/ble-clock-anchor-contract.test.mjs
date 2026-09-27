import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/services/ble-clock-anchor.ts', import.meta.url),
  'utf8',
);

test('clock-anchor authority uses midpoint + explicit RTT uncertainty', () => {
  assert.match(source, /midpointMs = beforeUtcMs \+ Math\.floor\(roundTripMs \/ 2\)/);
  assert.match(source, /Math\.ceil\(roundTripMs \/ 2\) \+ 2/);
  assert.match(source, /CLOCK_SAMPLE_RTT_TOO_HIGH/);
  assert.match(source, /CLOCK_SAMPLE_BOOT_MISMATCH/);
  assert.doesNotMatch(source, /anchorUtc:\s*new Date\(afterUtcMs\)/);
  assert.doesNotMatch(source, /receivedAt/);
});
