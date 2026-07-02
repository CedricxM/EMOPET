/**
 * EKF observation model h(x, context) — including v6 additions.
 *
 * Each observation is emitted as an `ObservationRow` with its expected
 * value, linearized H row, and base variance. Null-valued rows are
 * filtered by the caller (update step) — never padded with zero.
 *
 * v6 additions:
 *   - rr_variability — non-monotonic in arousal in theory (panic can
 *     reduce variability); we use a piecewise-linear expectation that
 *     grows with arousal up to a = 0.7, then plateaus. Per
 *     Homma & Masaoka (2008) Exp Physiol.
 *   - activity_variability — monotone-increasing in arousal (unstable
 *     activity pattern). Linear observation model vs arousal.
 */

import type { FeatureVector, SubBaseline } from '@emopet/shared';
import type { StateVector, ObservationRow, EKFContext, ObservationName } from './types.js';

// ── Helpers ──────────────────────────────────────────────────────

function safeNum(v: number | null | undefined): number | null {
  return v == null || Number.isNaN(v) ? null : v;
}

// ── Observation functions ────────────────────────────────────────

/**
 * h(x) for rr_mean. Expected RR increases with arousal around baseline.
 * Reference: Brugarolas (2015) IEEE Sensors — RR responds to activation.
 */
function h_rr_mean(x: StateVector, baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.rr_mean);
  const rrBase = baseline.rrMean ?? 25;
  const rrStd = Math.max(baseline.rrStd ?? 4, 1);
  // Expected RR grows with arousal; slope tuned so arousal=1 adds ~+40% over baseline
  const expected = rrBase * (1 + 0.4 * x[0]);
  const dh_da = rrBase * 0.4;
  return {
    name: 'rr_mean',
    value,
    expected,
    H: [dh_da, 0, 0],
    R_base: rrStd * rrStd + 1,
  };
}

/**
 * v6: rr_variability. Expected STD of IBI grows with arousal up to a
 * plateau at a=0.7; after that, hypothetical "panic regularization"
 * flattens the response. Variance floor keeps weak updates stable.
 */
function h_rr_variability(x: StateVector, baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.rr_variability);
  const vBase = baseline.rrVariabilityMean;
  const vStd = baseline.rrVariabilityStd;
  if (vBase == null || vStd == null) {
    // Baseline lacks data: huge R → near-zero weight in update
    return { name: 'rr_variability', value, expected: 0, H: [0, 0, 0], R_base: 1e6 };
  }
  const a = x[0];
  const slope = a < 0.7 ? 0.5 : 0.0;
  const expected = vBase * (1 + (a < 0.7 ? 0.5 * a : 0.5 * 0.7));
  const dh_da = vBase * slope;
  return {
    name: 'rr_variability',
    value,
    expected,
    H: [dh_da, 0, 0],
    R_base: vStd * vStd + 0.005,
  };
}

/**
 * h(x) for ODBA mean. Monotone in arousal.
 * Reference: Robert et al. (2009) ODBA ↔ activity intensity.
 */
function h_odba_mean(x: StateVector, baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.odba_mean);
  const base = baseline.activityMean ?? 0.3;
  const std = Math.max(baseline.activityStd ?? 0.1, 0.05);
  const expected = base * (1 + 1.2 * x[0]);
  const dh_da = base * 1.2;
  return {
    name: 'odba_mean',
    value,
    expected,
    H: [dh_da, 0, 0],
    R_base: std * std + 0.01,
  };
}

/**
 * v6: activity_variability (CV of 1s ODBA). Linear growth in arousal —
 * elevated arousal makes activity more irregular.
 */
function h_activity_variability(x: StateVector, baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.activity_variability);
  const vBase = baseline.activityVariabilityMean;
  const vStd = baseline.activityVariabilityStd;
  if (vBase == null || vStd == null) {
    return { name: 'activity_variability', value, expected: 0, H: [0, 0, 0], R_base: 1e6 };
  }
  const expected = vBase * (1 + 0.4 * x[0]);
  const dh_da = vBase * 0.4;
  return {
    name: 'activity_variability',
    value,
    expected,
    H: [dh_da, 0, 0],
    R_base: vStd * vStd + 0.01,
  };
}

function h_activity_minutes_pct(x: StateVector, _baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.activity_minutes_pct);
  const expected = Math.min(1, 0.15 + 0.6 * x[0]);
  return {
    name: 'activity_minutes_pct',
    value,
    expected,
    H: [0.6, 0, 0],
    R_base: 0.04,
  };
}

/**
 * Vocal energy relates to valence (negative valence -> whines, higher
 * vocal energy during absence). Simple linear model: more energy when
 * valence is negative AND arousal is elevated.
 */
function h_vocal_energy(x: StateVector, _baseline: SubBaseline, fv: FeatureVector): ObservationRow {
  const value = safeNum(fv.vocal_energy_mean);
  const expected = Math.max(0, 0.1 + 0.3 * x[0] - 0.2 * x[1]);
  return {
    name: 'vocal_energy_mean',
    value,
    expected,
    H: [0.3, -0.2, 0],
    R_base: 0.05,
  };
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Produce the full observation set for this update. The caller filters
 * null-valued rows before forming H and R (see update.ts).
 */
export function observationRows(
  x: StateVector,
  baseline: SubBaseline,
  fv: FeatureVector,
  ctx: EKFContext,
): ObservationRow[] {
  const rows = [
    h_rr_mean(x, baseline, fv),
    h_rr_variability(x, baseline, fv),
    h_odba_mean(x, baseline, fv),
    h_activity_variability(x, baseline, fv),
    h_activity_minutes_pct(x, baseline, fv),
    h_vocal_energy(x, baseline, fv),
  ];
  // Apply RSM noise multiplier (1.0..Inf) from context. Rows with
  // infinite effective noise are effectively pruned by update().
  const mult = Math.max(1, ctx.sensorNoiseMultiplier);
  return rows.map((r) => ({ ...r, R_base: r.R_base * mult }));
}

export const ALL_OBSERVATIONS: ObservationName[] = [
  'rr_mean',
  'rr_variability',
  'odba_mean',
  'activity_variability',
  'activity_minutes_pct',
  'vocal_energy_mean',
];
