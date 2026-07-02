/**
 * InferenceResult — the per-window output of the ELI core.
 *
 * Consumed by the Bleiz scheduler (to decide template triggers) and by
 * the mobile app (to drive the ELI display and v6 insight cards).
 *
 * v6 adds `anticipation_detected` and `recovery_speed_current`. The
 * existing arousal/valence/load/confidence/gateStatus fields in ELIState
 * (eli.ts) remain unchanged.
 */

import type { ELIState } from './eli.js';
import type { SubBaselineSlot } from './sub-baseline.js';

export type AnticipationEventType = 'owner_departure' | 'walk_time' | 'meal_time';

export interface AnticipationDetected {
  event_type: AnticipationEventType;
  /** Always 15 in v6 — kept as field for forward compatibility. */
  pre_event_window_minutes: 15;
  /** mean(activity_pre_event) / mean(activity_baseline_same_hour) */
  activity_ratio: number;
  /** Count of occurrences where the ratio exceeded 1.5 in the trailing 30d. */
  occurrences_count: number;
  /** True when ratio > 1.5 AND occurrences_count >= 7. */
  detection_threshold_met: boolean;
}

export interface RecoverySpeedCurrent {
  minutes_to_baseline: number;
  context_slot: SubBaselineSlot;
  /** How this episode compares to the sub-baseline recovery mean, in %. */
  deviation_from_baseline_pct: number;
}

export interface InferenceResult {
  /** Latent ELI state (arousal, valence, load, confidence, gate). */
  eli: ELIState;
  /** Which vetoes fired on this inference. IDs like "V11_HIGH_ANIMAL_INTERACTION". */
  active_vetoes: string[];
  /** Which features contributed non-negligibly to this update (for audit/UI). */
  contributing_features: string[];

  // v6 additions ────────────────────────────────────────────────
  anticipation_detected: AnticipationDetected | null;
  recovery_speed_current: RecoverySpeedCurrent | null;
}
