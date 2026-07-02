/**
 * EKF public API — runs predict + update on a FeatureVector and returns
 * the refreshed state plus metadata useful to confidence gating.
 */

export * from './types.js';
export {
  predictState,
  effectiveLoadDecayPerDay,
  LOAD_DECAY_PER_DAY_BASE,
  LOAD_DECAY_TREND_MULTIPLIER,
  RECOVERY_TREND_PCT_THRESHOLD,
} from './state-transition.js';
export { observationRows, ALL_OBSERVATIONS } from './observation-model.js';
export { predict, update, crossModalAgreement } from './update.js';

import type { FeatureVector, SubBaseline } from '@emopet/shared';
import type { EKFState, EKFContext } from './types.js';
import { predict, update, crossModalAgreement } from './update.js';
import { observationRows } from './observation-model.js';

/**
 * Convenience wrapper: predict-to-now, build observations from the
 * FeatureVector against the given baseline, and apply the update.
 */
export function stepEKF(
  state: EKFState,
  fv: FeatureVector,
  baseline: SubBaseline,
  ctx: EKFContext,
): {
  state: EKFState;
  contributed: string[];
  agreement: number;
} {
  const predicted = predict(state, fv.timestamp, ctx);
  const rows = observationRows(predicted.x, baseline, fv, ctx);
  const { state: next, contributed } = update(predicted, rows);
  const agreement = crossModalAgreement(rows);
  return { state: next, contributed, agreement };
}

export function createInitialEKF(timestamp: Date): EKFState {
  return {
    x: [0.2, 0, 0.1],
    P: [
      [0.1, 0,   0],
      [0,   0.2, 0],
      [0,   0,   0.05],
    ],
    lastUpdatedAt: timestamp,
  };
}
