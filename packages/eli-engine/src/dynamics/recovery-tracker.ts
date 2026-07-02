/**
 * RecoveryTracker — detects activation episodes and measures time-to-baseline.
 *
 * An activation episode begins when arousal a_t exceeds
 *   baseline.rrMean-derived threshold + 1.5*std  (expressed in arousal units)
 * and ends when a_t stays below
 *   baseline + 0.5*std
 * for at least 5 consecutive minutes. The elapsed time between these two
 * moments is the recovery_minutes value, which is:
 *   - persisted to `recovery_events` for longitudinal analysis
 *   - folded into the sub-baseline EMA (alpha 0.1)
 *   - used to compute a 4-week trend per slot (see computeRecoveryTrend4w)
 *
 * Reference: McEwen (1998) NEJM — Type 3 allostatic load (prolonged
 * response after stressor end). Slowing recovery is the most direct
 * signal of accumulating allostatic load.
 */

import type { SubBaseline, SubBaselineSlot } from '@emopet/shared';

export interface ActivationEpisode {
  startedAt: Date;
  peakArousal: number;
  slotAtStart: SubBaselineSlot;
  /** Timestamp when arousal fell below the low threshold; null if still active. */
  belowThresholdSince: Date | null;
}

export interface RecoveryCompleted {
  slot: SubBaselineSlot;
  startedAt: Date;
  returnedToBaselineAt: Date;
  recoveryMinutes: number;
  peakArousal: number;
}

export interface RecoverySample {
  recoveryMinutes: number;
  timestamp: Date; // returnedToBaselineAt
}

export const SUSTAINED_RETURN_SECONDS = 300; // 5 min
export const EMA_ALPHA = 0.1;

export class RecoveryTracker {
  private episode: ActivationEpisode | null = null;

  constructor(public readonly dogId: string) {}

  /**
   * Called on every EKF update. Returns a RecoveryCompleted when an
   * episode finishes, otherwise null.
   *
   * arousalThresholds are derived externally from the baseline (arousal
   * is unitless in [0,1], so the thresholds are absolute, not in RR/std
   * units). Reasonable defaults: thresholdHigh = baseline.activationLow
   * + 1.5*sigma, thresholdLow = baseline.activationLow + 0.5*sigma,
   * where sigma is the baseline noise on arousal (~0.08).
   */
  update(
    arousal: number,
    slot: SubBaselineSlot,
    thresholdHigh: number,
    thresholdLow: number,
    now: Date,
  ): RecoveryCompleted | null {
    if (this.episode == null) {
      if (arousal > thresholdHigh) {
        this.episode = {
          startedAt: now,
          peakArousal: arousal,
          slotAtStart: slot,
          belowThresholdSince: null,
        };
      }
      return null;
    }

    // Episode in progress
    if (arousal > this.episode.peakArousal) {
      this.episode.peakArousal = arousal;
    }

    if (arousal < thresholdLow) {
      if (this.episode.belowThresholdSince == null) {
        this.episode.belowThresholdSince = now;
      } else {
        const elapsedSec = (now.getTime() - this.episode.belowThresholdSince.getTime()) / 1000;
        if (elapsedSec >= SUSTAINED_RETURN_SECONDS) {
          const recoveryMinutes =
            (this.episode.belowThresholdSince.getTime() - this.episode.startedAt.getTime()) /
            60000;
          const completed: RecoveryCompleted = {
            slot: this.episode.slotAtStart,
            startedAt: this.episode.startedAt,
            returnedToBaselineAt: this.episode.belowThresholdSince,
            recoveryMinutes,
            peakArousal: this.episode.peakArousal,
          };
          this.episode = null;
          return completed;
        }
      }
    } else {
      // Arousal went above the low threshold again before 5 min — reset
      this.episode.belowThresholdSince = null;
    }

    return null;
  }

  /** Expose current episode for diagnostics/persistence. */
  getActiveEpisode(): ActivationEpisode | null {
    return this.episode;
  }
}

// ── Trend + EMA helpers ─────────────────────────────────────────

/**
 * Update (mean, std, sampleCount) with a new recovery_minutes sample
 * using an exponential moving average with alpha = 0.1. Std uses the
 * same EMA on squared deviation.
 */
export function updateRecoveryEMA(
  prev: { mean: number | null; std: number | null; sample_count: number },
  sample: number,
): { mean: number; std: number; sample_count: number } {
  const n = prev.sample_count;
  const newCount = n + 1;
  if (prev.mean == null || prev.std == null || n === 0) {
    return { mean: sample, std: 0, sample_count: newCount };
  }
  const newMean = (1 - EMA_ALPHA) * prev.mean + EMA_ALPHA * sample;
  const dev = sample - prev.mean;
  const newVar = (1 - EMA_ALPHA) * prev.std * prev.std + EMA_ALPHA * dev * dev;
  return { mean: newMean, std: Math.sqrt(Math.max(newVar, 0)), sample_count: newCount };
}

/**
 * Compute percent change in recovery time over the last 4 weeks.
 * Returns null if fewer than 4 samples in trailing 28 days.
 *
 * Split method: mean of first 14 days vs mean of last 14 days.
 */
export function computeRecoveryTrend4wPct(
  samples: RecoverySample[],
  now: Date,
): number | null {
  const cutoff = new Date(now.getTime() - 28 * 86400 * 1000);
  const recent = samples.filter((s) => s.timestamp >= cutoff);
  if (recent.length < 4) return null;

  const midpoint = new Date(now.getTime() - 14 * 86400 * 1000);
  const firstHalf = recent.filter((s) => s.timestamp < midpoint).map((s) => s.recoveryMinutes);
  const secondHalf = recent.filter((s) => s.timestamp >= midpoint).map((s) => s.recoveryMinutes);
  if (firstHalf.length === 0 || secondHalf.length === 0) return null;

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mA = avg(firstHalf);
  const mB = avg(secondHalf);
  if (mA <= 0) return null;
  return ((mB - mA) / mA) * 100;
}

/**
 * Helper: build a RecoverySpeedCurrent summary for InferenceResult,
 * given a just-completed RecoveryCompleted event and its baseline.
 */
export function recoverySpeedCurrent(
  completed: RecoveryCompleted,
  baseline: SubBaseline,
) {
  const baseMean = baseline.recoveryTimeToBaselineMinutes?.mean ?? null;
  const deviation_from_baseline_pct =
    baseMean != null && baseMean > 0
      ? ((completed.recoveryMinutes - baseMean) / baseMean) * 100
      : 0;
  return {
    minutes_to_baseline: completed.recoveryMinutes,
    context_slot: completed.slot,
    deviation_from_baseline_pct,
  };
}
