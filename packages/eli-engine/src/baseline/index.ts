/**
 * Baseline Learning — per-dog behavioral baseline accumulation.
 *
 * During the warmup period (default 10 days, minimum 72 hours of data),
 * the system collects sensor summaries to establish per-dog baselines
 * for arousal, valence proxy, respiratory rate, activity level, etc.
 *
 * Until baseline is established, ELI outputs are gated to DEGRADE
 * regardless of sensor confidence.
 */

import {
  ELI_BASELINE_WARMUP_DAYS,
  ELI_BASELINE_MIN_HOURS,
} from '@emopet/shared';

// ── Baseline State ──────────────────────────────────────────────

export interface BaselineMetric {
  /** Running mean. */
  mean: number;
  /** Running variance (Welford's online algorithm). */
  variance: number;
  /** Number of samples. */
  count: number;
}

export interface BaselineState {
  dogId: string;
  /** When baseline collection started. */
  startedAt: Date;
  /** Total hours of valid data collected. */
  validHours: number;
  /** Whether baseline is considered established. */
  established: boolean;
  /** Per-metric baselines. */
  metrics: {
    respiratoryRate: BaselineMetric;
    activityMagnitude: BaselineMetric;
    restDuration: BaselineMetric;
    vocalFrequency: BaselineMetric;
    weightKg: BaselineMetric;
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function createMetric(): BaselineMetric {
  return { mean: 0, variance: 0, count: 0 };
}

/**
 * Welford's online update for mean and variance.
 */
function updateMetric(metric: BaselineMetric, value: number): void {
  metric.count++;
  const delta = value - metric.mean;
  metric.mean += delta / metric.count;
  const delta2 = value - metric.mean;
  metric.variance += delta * delta2;
}

/**
 * Get the standard deviation from a BaselineMetric.
 */
export function metricStdDev(metric: BaselineMetric): number {
  if (metric.count < 2) return 0;
  return Math.sqrt(metric.variance / (metric.count - 1));
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Create a fresh baseline state for a dog.
 */
export function createBaseline(dogId: string): BaselineState {
  return {
    dogId,
    startedAt: new Date(),
    validHours: 0,
    established: false,
    metrics: {
      respiratoryRate: createMetric(),
      activityMagnitude: createMetric(),
      restDuration: createMetric(),
      vocalFrequency: createMetric(),
      weightKg: createMetric(),
    },
  };
}

/** Input for a single baseline update (one hourly summary). */
export interface BaselineUpdate {
  /** Hours of valid sensor data in this summary (0–1). */
  validHoursInWindow: number;
  respiratoryRate?: number;
  activityMagnitude?: number;
  restMinutes?: number;
  vocalEventsPerHour?: number;
  weightKg?: number;
}

/**
 * Update baseline with a new hourly sensor summary.
 */
export function updateBaseline(
  state: BaselineState,
  update: BaselineUpdate,
): void {
  state.validHours += update.validHoursInWindow;

  if (update.respiratoryRate != null) {
    updateMetric(state.metrics.respiratoryRate, update.respiratoryRate);
  }
  if (update.activityMagnitude != null) {
    updateMetric(state.metrics.activityMagnitude, update.activityMagnitude);
  }
  if (update.restMinutes != null) {
    updateMetric(state.metrics.restDuration, update.restMinutes);
  }
  if (update.vocalEventsPerHour != null) {
    updateMetric(state.metrics.vocalFrequency, update.vocalEventsPerHour);
  }
  if (update.weightKg != null) {
    updateMetric(state.metrics.weightKg, update.weightKg);
  }

  // Check if baseline is now established
  if (!state.established) {
    const daysSinceStart =
      (Date.now() - state.startedAt.getTime()) / (1000 * 60 * 60 * 24);
    state.established =
      daysSinceStart >= ELI_BASELINE_WARMUP_DAYS &&
      state.validHours >= ELI_BASELINE_MIN_HOURS;
  }
}

/**
 * Check how far along baseline learning is (0–1 progress).
 */
export function baselineProgress(state: BaselineState): number {
  const daysSinceStart =
    (Date.now() - state.startedAt.getTime()) / (1000 * 60 * 60 * 24);
  const dayProgress = Math.min(1, daysSinceStart / ELI_BASELINE_WARMUP_DAYS);
  const hourProgress = Math.min(1, state.validHours / ELI_BASELINE_MIN_HOURS);
  // Both conditions must be met, so progress is the minimum
  return Math.min(dayProgress, hourProgress);
}

/**
 * Compute a z-score for a metric value against its baseline.
 * Returns 0 if baseline has insufficient data (< 10 samples).
 */
export function baselineZScore(metric: BaselineMetric, value: number): number {
  if (metric.count < 10) return 0;
  const std = metricStdDev(metric);
  if (std < 1e-6) return 0;
  return (value - metric.mean) / std;
}
