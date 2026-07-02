/**
 * SubBaseline — contextual baseline for a (dog, slot) pair.
 *
 * Mirrors the `dog_sub_baselines` table. v6 adds per-slot stats for
 * rr_variability and activity_variability (so the EKF observation model
 * can compare the latest feature to a context-matched expectation) and a
 * `recovery_time_to_baseline_minutes` sub-structure driving allostatic
 * load via the alpha_L modulation.
 *
 * The five slots cover the canonical behavioral contexts:
 *   deep_rest_mat, light_rest_mat, owner_present, owner_absent, daytime_active
 */

export type SubBaselineSlot =
  | 'deep_rest_mat'
  | 'light_rest_mat'
  | 'owner_present'
  | 'owner_absent'
  | 'daytime_active';

export interface RecoveryTimeStats {
  /** Exponential moving mean of recovery minutes. */
  mean: number | null;
  /** Exponential moving std of recovery minutes. */
  std: number | null;
  /** Number of completed recovery episodes observed. */
  sample_count: number;
  /**
   * Percent change of recovery-time mean over the trailing 4 weeks
   * (second half vs first half). Null if <4 samples in trailing 28 days.
   * A positive value > 20% triggers ALLO_RECOVERY_SLOWING and raises
   * alpha_L by 10% per McEwen (1998) Type-3 allostatic load.
   */
  trend_4w_pct: number | null;
  last_updated: Date | null;
}

export interface SubBaseline {
  dogId: string;
  slot: SubBaselineSlot;

  // v5 fields
  rrMean: number | null;
  rrStd: number | null;
  activityMean: number | null;
  activityStd: number | null;
  matMinutesMean: number | null;
  vocalRateMean: number | null;

  // v6 additions
  rrVariabilityMean: number | null;
  rrVariabilityStd: number | null;
  activityVariabilityMean: number | null;
  activityVariabilityStd: number | null;
  recoveryTimeToBaselineMinutes: RecoveryTimeStats | null;

  sampleCount: number;
  confidence: number;
  lastUpdated: Date | null;
}
