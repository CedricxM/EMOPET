import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEEP_SLEEP_BREATHS_PER_MIN_LOW,
  RESTING_BREATHS_PER_MIN_LOW,
  evaluate,
  intervalsIn,
  readConstants,
} from './rr-variability-window-audit.mjs';

test('the firmware window is viable at the slowest normal resting rate', () => {
  const result = evaluate(readConstants());
  assert.equal(result.windowSec, 300);
  assert.equal(result.minCount, 30);
  assert.ok(
    result.viableAtRest,
    `${result.windowSec}s yields only ${result.restingIntervals} intervals at ` +
      `${RESTING_BREATHS_PER_MIN_LOW} breaths/min`,
  );
  assert.equal(result.restingIntervals, 74);
});

test('the documented 60 s window is arithmetically unreachable — this is the #86 finding', () => {
  const sixtySecond = evaluate({
    windowSec: 60,
    minCount: 30,
    minIbiSec: 0.3,
    maxIbiSec: 10,
  });
  // 15 breaths in 60 s is 14 intervals; the same spec demands 30.
  assert.equal(sixtySecond.restingIntervals, 14);
  assert.equal(sixtySecond.viableAtRest, false);

  // Even the top of the normal resting range falls short, so the feature would
  // only ever produce a value above 31 breaths/min — outside normal rest.
  assert.equal(intervalsIn(60, 30), 29);
  assert.ok(intervalsIn(60, 31) >= 30);
});

test('the deep-sleep tail is reported as a blind spot, not silently passed', () => {
  const result = evaluate(readConstants());
  assert.equal(result.deepSleepIntervals, 29);
  assert.equal(result.coversDeepSleep, false);
  assert.ok(
    result.deepSleepIntervals < result.minCount,
    'if this ever passes, the gate or window changed — re-read #86',
  );
  assert.equal(DEEP_SLEEP_BREATHS_PER_MIN_LOW, 6);
});

test('the audit does not encode a statistic, which stays open in #86', async () => {
  const source = await import('node:fs').then(({ readFileSync }) =>
    readFileSync(new URL('./rr-variability-window-audit.mjs', import.meta.url), 'utf8'),
  );
  // No division by a mean, no sqrt: this file must not become a second place
  // where CV-vs-SD is decided.
  assert.ok(!/Math\.sqrt|\/\s*mean/.test(source));
  assert.match(source, /#86/);
});
