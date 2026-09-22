/**
 * rr_variability window/count viability audit — static arithmetic only.
 *
 * A PASS is NOT science, bench, animal or product-authority evidence. It proves
 * one narrow thing: that the firmware's configured window can, arithmetically,
 * collect the minimum number of inter-breath intervals it requires, at the
 * canine resting respiratory rates the MAT is designed to observe.
 *
 * It deliberately does NOT decide the contested statistic (coefficient of
 * variation vs standard deviation). That is #86 (FW-SCI-01). This audit only
 * prevents the documented 60 s window from being propagated into firmware,
 * because at canine resting rates a 60 s window cannot reach the 30-interval
 * gate the same spec requires — the feature would return NAN for every dog
 * breathing normally, and produce a value only when breathing is abnormally
 * fast.
 *
 * Reference range, veterinary consensus for dogs at rest or asleep:
 * 15-30 breaths/min, with rates persistently above 30 considered abnormal.
 * Sources: VCA Animal Hospitals "Home Breathing Rate Evaluation";
 * Veterinary Partner (VIN) "Sleeping and Resting Respiratory Rates of Dogs
 * and Cats with Heart Disease"; Cardiac Education Group monitoring guidance.
 * Recorded as an external clinical reference, not as an EMOPET measurement.
 *
 * No network. No writes.
 */

import { readFileSync } from 'node:fs';

export const HEADER = 'firmware/mat/main/sensors/rr_variability.h';

/** Binding case: the slowest end of the normal RESTING range. */
export const RESTING_BREATHS_PER_MIN_LOW = 15;
/** Reported for visibility only; deep sleep can go lower than the resting range. */
export const DEEP_SLEEP_BREATHS_PER_MIN_LOW = 6;

export function readConstants(root = new URL('../../', import.meta.url)) {
  const source = readFileSync(new URL(HEADER, root), 'utf8');
  const read = (name) => {
    const match = source.match(new RegExp(`#define\\s+${name}\\s+([0-9.]+)f?`));
    if (!match) throw new Error(`${HEADER}: missing #define ${name}`);
    return Number(match[1]);
  };
  return {
    windowSec: read('RR_IBI_BUFFER_WINDOW_SEC'),
    minCount: read('RR_IBI_MIN_COUNT'),
    minIbiSec: read('RR_IBI_MIN_SEC'),
    maxIbiSec: read('RR_IBI_MAX_SEC'),
  };
}

/** Inter-breath intervals observable in `windowSec` at `breathsPerMin`. */
export function intervalsIn(windowSec, breathsPerMin) {
  return Math.max(0, Math.floor((windowSec * breathsPerMin) / 60) - 1);
}

export function evaluate(constants) {
  const resting = intervalsIn(constants.windowSec, RESTING_BREATHS_PER_MIN_LOW);
  const deepSleep = intervalsIn(constants.windowSec, DEEP_SLEEP_BREATHS_PER_MIN_LOW);
  return {
    ...constants,
    restingIntervals: resting,
    deepSleepIntervals: deepSleep,
    viableAtRest: resting >= constants.minCount,
    // Not a failure: a documented blind spot, reported so it reaches #86.
    coversDeepSleep: deepSleep >= constants.minCount,
  };
}

export function report(result) {
  const lines = [
    `window: ${result.windowSec}s   min intervals required: ${result.minCount}`,
    `accepted IBI range: [${result.minIbiSec}, ${result.maxIbiSec}] s`,
    `at ${RESTING_BREATHS_PER_MIN_LOW} breaths/min (slowest normal resting): ` +
      `${result.restingIntervals} intervals -> ${result.viableAtRest ? 'OK' : 'UNREACHABLE'}`,
    `at ${DEEP_SLEEP_BREATHS_PER_MIN_LOW} breaths/min (deep sleep tail): ` +
      `${result.deepSleepIntervals} intervals -> ${result.coversDeepSleep ? 'covered' : 'NOT covered (known blind spot, #86)'}`,
  ];
  return lines.join('\n');
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const result = evaluate(readConstants());
  console.log(report(result));
  if (!result.viableAtRest) {
    console.error(
      `\nFAIL: a ${result.windowSec}s window cannot reach ${result.minCount} inter-breath ` +
        `intervals at ${RESTING_BREATHS_PER_MIN_LOW} breaths/min. The feature would return NAN ` +
        `for a dog breathing at a normal resting rate. See #86 before changing either constant.`,
    );
    process.exit(1);
  }
  if (!result.coversDeepSleep) {
    console.log(
      `\nNOTE: the deep-sleep tail (~${DEEP_SLEEP_BREATHS_PER_MIN_LOW} breaths/min) stays below ` +
        `the ${result.minCount}-interval gate. Not a failure; recorded for #86, since sleep is ` +
        `the MAT's target state.`,
    );
  }
}
