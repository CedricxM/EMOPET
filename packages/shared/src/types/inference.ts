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
  /** Raw recurring-event occurrences supplied in the trailing analysis window. */
  event_occurrence_count: number;
  /** Historical event windows whose activity ratio exceeded the current threshold. */
  above_threshold_hit_count: number;
  /**
   * @deprecated Ambiguous v6 field retained for compatibility.
   * Equals above_threshold_hit_count, not raw event occurrences.
   */
  occurrences_count: number;
  /** Current implementation: ratio > 1.5 AND above_threshold_hit_count >= 7. */
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
