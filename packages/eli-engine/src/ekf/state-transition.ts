/**
 * EKF state transition f(x, dt).
 *
 * Arousal a_t and valence v_t decay toward 0 with short time constants
 * (minutes). Load L_t integrates sustained arousal and decays with a much
 * longer time constant (~weeks) — this is the allostatic load channel.
 *
 * The dynamics are intentionally simple — inference quality comes from
 * the observation model and from the sub-baselines, not from a complex
 * state equation. v6 does NOT change the equations; it only makes
 * alpha_L context-dependent (multiplier 1.10 when recovery is slowing)
 * per McEwen (1998) allostatic load Type 3.
 */

import type { StateVector, Covariance3, EKFContext } from './types.js';

export const AROUSAL_DECAY_PER_MIN = 0.10;     // 10%/min — tau ~10 min
export const VALENCE_DECAY_PER_MIN = 0.05;
export const LOAD_ACCUMULATION_GAIN = 0.002;   // dL = gain * max(a - 0.3, 0) * dt
export const LOAD_DECAY_PER_DAY_BASE = 1 / 90; // half-life ~62 days
/** Multiplier applied to alpha_L when recovery_trend_4w_pct > threshold. */
export const LOAD_DECAY_TREND_MULTIPLIER = 1.10;
/** Threshold beyond which allostatic load decay is INHIBITED (dynamic). */
export const RECOVERY_TREND_PCT_THRESHOLD = 20.0;

/** Stable clamp. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Compute the context-dependent alpha_L.
 *
 * When recovery is slowing (trend > +20% over 4 weeks) we *decrease* the
 * effective decay — equivalently, increase the coefficient multiplying
 * the "load sticks around" term. Implemented as raising the retention
 * constant so load accumulates faster/persists longer.
 */
export function effectiveLoadDecayPerDay(ctx: EKFContext): number {
  const base = LOAD_DECAY_PER_DAY_BASE;
  if (ctx.recoveryTrend4wPct != null && ctx.recoveryTrend4wPct > RECOVERY_TREND_PCT_THRESHOLD) {
    return base / LOAD_DECAY_TREND_MULTIPLIER; // slower decay
  }
  return base;
}

/**
 * f(x, dt) — predict next state given elapsed seconds.
 */
export function predictState(x: StateVector, dtSec: number, ctx: EKFContext): StateVector {
  const dtMin = dtSec / 60;
  const dtDay = dtSec / 86400;

  const a0 = x[0];
  const v0 = x[1];
  const L0 = x[2];

  const a1 = clamp(a0 * Math.exp(-AROUSAL_DECAY_PER_MIN * dtMin), 0, 1);
  const v1 = clamp(v0 * Math.exp(-VALENCE_DECAY_PER_MIN * dtMin), -1, 1);

  // Load integrates sustained arousal above 0.3 and decays at alpha_L.
  const drive = Math.max(a0 - 0.3, 0);
  const alpha = effectiveLoadDecayPerDay(ctx);
  const L1 = clamp(
    L0 * Math.exp(-alpha * dtDay) + LOAD_ACCUMULATION_GAIN * drive * (dtSec / 60),
    0,
    1,
  );

  return [a1, v1, L1];
}

/**
 * Linearized F = df/dx for the same dt and context — used to propagate P.
 * Off-diagonal cross-terms for load/arousal are included (dL/da != 0).
 */
export function stateJacobian(x: StateVector, dtSec: number, ctx: EKFContext): Covariance3 {
  const dtMin = dtSec / 60;
  const dtDay = dtSec / 86400;
  const alpha = effectiveLoadDecayPerDay(ctx);

  const dA_dA = Math.exp(-AROUSAL_DECAY_PER_MIN * dtMin);
  const dV_dV = Math.exp(-VALENCE_DECAY_PER_MIN * dtMin);
  const dL_dL = Math.exp(-alpha * dtDay);
  const dL_dA = x[0] > 0.3 ? LOAD_ACCUMULATION_GAIN * (dtSec / 60) : 0;

  return [
    [dA_dA, 0,      0],
    [0,     dV_dV,  0],
    [dL_dA, 0,      dL_dL],
  ];
}

/** Process noise per dt (diagonal). Kept simple. */
export function processNoise(dtSec: number): Covariance3 {
  const dtMin = dtSec / 60;
  const qA = 0.002 * dtMin;
  const qV = 0.001 * dtMin;
  const qL = 0.00005 * dtMin;
  return [
    [qA, 0,  0],
    [0,  qV, 0],
    [0,  0,  qL],
  ];
}
