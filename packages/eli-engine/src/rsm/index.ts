/**
 * Reliability State Machine (RSM) — per-sensor trust logic.
 *
 * Each sensor operates in one of three states:
 *   VALID      → output accepted by inference pipeline
 *   DEGRADED   → output accepted with inflated observation noise
 *   SUPPRESSED → output excluded from inference update
 *
 * Transitions are driven by signal-quality metrics, not model-level
 * uncertainty. Signal quality is assessed BEFORE the inference layer
 * sees any data.
 */

import type { ReliabilityState } from '@emopet/shared';

// ── Sensor Identifiers ──────────────────────────────────────────

export type SensorId = 'pvdf' | 'loadCells' | 'imu' | 'mic' | 'piezo' | 'gps';

// ── Transition Thresholds ───────────────────────────────────────

export interface SensorThresholds {
  /** Metric value above which sensor is VALID. */
  validAbove: number;
  /** Metric value below which sensor is SUPPRESSED. */
  suppressBelow: number;
  /** Consecutive windows required before upgrading state. */
  upgradeCount: number;
  /** Consecutive windows required before downgrading state. */
  degradeCount: number;
}

/** Default thresholds per sensor (signal quality metric in [0, 1]). */
export const DEFAULT_THRESHOLDS: Record<SensorId, SensorThresholds> = {
  pvdf: { validAbove: 0.7, suppressBelow: 0.2, upgradeCount: 3, degradeCount: 2 },
  loadCells: { validAbove: 0.8, suppressBelow: 0.15, upgradeCount: 2, degradeCount: 2 },
  imu: { validAbove: 0.75, suppressBelow: 0.2, upgradeCount: 2, degradeCount: 2 },
  mic: { validAbove: 0.6, suppressBelow: 0.15, upgradeCount: 3, degradeCount: 3 },
  piezo: { validAbove: 0.5, suppressBelow: 0.1, upgradeCount: 4, degradeCount: 2 },
  gps: { validAbove: 0.6, suppressBelow: 0.1, upgradeCount: 2, degradeCount: 3 },
};

// ── State Machine ───────────────────────────────────────────────

export interface RSMState {
  current: ReliabilityState;
  /** Consecutive windows in the direction of upgrade. */
  upgradeStreak: number;
  /** Consecutive windows in the direction of downgrade. */
  degradeStreak: number;
}

const STATE_ORDER: ReliabilityState[] = ['SUPPRESSED', 'DEGRADED', 'VALID'];

function stateIndex(s: ReliabilityState): number {
  return STATE_ORDER.indexOf(s);
}

/**
 * Create a fresh RSM state, starting DEGRADED (conservative until proven).
 */
export function createRSM(): RSMState {
  return { current: 'DEGRADED', upgradeStreak: 0, degradeStreak: 0 };
}

/**
 * Update the RSM with a new signal quality metric.
 *
 * @param state Current RSM state (mutated in place and returned).
 * @param quality Signal quality metric in [0, 1].
 * @param thresholds Transition thresholds for this sensor.
 * @returns The updated state.
 */
export function updateRSM(
  state: RSMState,
  quality: number,
  thresholds: SensorThresholds,
): RSMState {
  const idx = stateIndex(state.current);

  // Determine direction
  if (quality >= thresholds.validAbove) {
    // Signal is good — count toward upgrade
    state.upgradeStreak++;
    state.degradeStreak = 0;
  } else if (quality <= thresholds.suppressBelow) {
    // Signal is bad — count toward downgrade
    state.degradeStreak++;
    state.upgradeStreak = 0;
  } else {
    // In the gray zone — reset both streaks (hysteresis)
    state.upgradeStreak = 0;
    state.degradeStreak = 0;
  }

  // Attempt upgrade (SUPPRESSED → DEGRADED or DEGRADED → VALID)
  if (state.upgradeStreak >= thresholds.upgradeCount && idx < STATE_ORDER.length - 1) {
    state.current = STATE_ORDER[idx + 1]!;
    state.upgradeStreak = 0;
  }

  // Attempt downgrade (VALID → DEGRADED or DEGRADED → SUPPRESSED)
  if (state.degradeStreak >= thresholds.degradeCount && idx > 0) {
    state.current = STATE_ORDER[idx - 1]!;
    state.degradeStreak = 0;
  }

  return state;
}

// ── Noise Multiplier ────────────────────────────────────────────

/**
 * Get the observation noise multiplier for the current reliability state.
 * VALID = 1.0 (nominal), DEGRADED = 3.0 (inflated), SUPPRESSED = Infinity.
 */
export function noiseMultiplier(state: ReliabilityState): number {
  switch (state) {
    case 'VALID': return 1.0;
    case 'DEGRADED': return 3.0;
    case 'SUPPRESSED': return Infinity;
  }
}
