/**
 * EKF core types.
 *
 * State vector x (3D):
 *   x[0] = arousal a_t in [0, 1]
 *   x[1] = valence v_t in [-1, 1]  (internal, never published)
 *   x[2] = load    L_t in [0, 1]   (published as the ELI value)
 *
 * Covariance P is a 3x3 matrix.
 *
 * v5 constants (do NOT change per v6 non-goals):
 *   Publish threshold 0.70, degrade threshold 0.40.
 *   Base alpha_L decay rate 1/90 per day (load-memory half-life ~62d).
 *
 * v6 modification (allowed per spec):
 *   alpha_L may be multiplied by 1.10 when recovery_trend_4w_pct > 20%
 *   in the current context slot (see ekf/state-transition.ts).
 */

import type { SubBaselineSlot } from '@emopet/shared';

export type StateVector = [number, number, number];

/** 3x3 row-major symmetric covariance. */
export type Covariance3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

export interface EKFState {
  x: StateVector;
  P: Covariance3;
  /** Last update timestamp (wall-clock). Used to compute dt in state transition. */
  lastUpdatedAt: Date;
}

/**
 * Named observation channels. Each observation carries a value (or null
 * when missing) and the channel's base variance contribution. The channel
 * name is the key used by the Kalman gain computation and for debug output.
 */
export type ObservationName =
  | 'rr_mean'
  | 'rr_variability'          // v6
  | 'odba_mean'
  | 'activity_variability'     // v6
  | 'activity_minutes_pct'
  | 'vocal_energy_mean';

export interface ObservationRow {
  name: ObservationName;
  /** Observed value; null means "missing — skip". */
  value: number | null;
  /** Expected value under h(x, context). */
  expected: number;
  /** Linearized dh/dx row, 3 entries. */
  H: [number, number, number];
  /** Base observation variance (before RSM noise multiplier). */
  R_base: number;
}

export interface EKFContext {
  slot: SubBaselineSlot;
  /** Noise multiplier derived from per-sensor RSM state (1.0..Inf). */
  sensorNoiseMultiplier: number;
  /**
   * Current recovery 4w trend percent for this dog's context slot; used
   * only to modulate alpha_L. Null if baseline lacks data.
   */
  recoveryTrend4wPct: number | null;
}
