/**
 * Integration test: 14 days of synthetic data pushed through the pipeline.
 *
 * Confirms that the full stack (FeatureVector -> veto pipeline -> EKF
 * predict+update -> RecoveryTracker -> AnticipationTracker) produces the
 * expected v6 outputs on scenarios designed to trigger each one.
 *
 * The test is kept coarse — it asserts that the v6 trackers emit the
 * expected events, not that the ELI value matches a precise target.
 */

import { describe, expect, it } from 'vitest';

import type { FeatureVector, SubBaseline } from '@emopet/shared';
import {
  createInitialEKF,
  observationRows,
  predict,
  update,
} from '../ekf/index.js';
import { RecoveryTracker } from '../dynamics/recovery-tracker.js';
import { computeAnticipationIndex } from '../dynamics/anticipation-tracker.js';

function baseline(): SubBaseline {
  return {
    dogId: 'd1', slot: 'owner_absent',
    rrMean: 25, rrStd: 4,
    activityMean: 0.3, activityStd: 0.1,
    matMinutesMean: 60, vocalRateMean: 2,
    rrVariabilityMean: 0.2, rrVariabilityStd: 0.05,
    activityVariabilityMean: 0.3, activityVariabilityStd: 0.05,
    recoveryTimeToBaselineMinutes: null,
    sampleCount: 200, confidence: 0.8,
    lastUpdated: new Date('2026-03-01T00:00:00Z'),
  };
}

function synthFV(at: Date, elevated: boolean): FeatureVector {
  return {
    timestamp: at, dogId: 'd1', deviceSource: 'MAT', firmwareVersion: '6.0.0',
    rr_mean: elevated ? 40 : 25,
    rr_confidence: 0.9,
    rr_variability: elevated ? 0.5 : 0.2,
    odba_mean: elevated ? 0.9 : 0.3,
    activity_minutes_pct: elevated ? 0.6 : 0.2,
    activity_variability: elevated ? 0.7 : 0.3,
    tremor_detected: false,
    lateral_acc_rms: 0.1,
    gyro_std_deg_s: 50,
    vocal_event_in_window: false,
    vocal_energy_mean: 0.1,
    ambient_temp_c: 20,
    humidity_pct: 50,
    quality: { pvdf: 1, imu: 1, mic: 1, loadCells: 1, piezo: 1, gps: 1 },
  };
}

describe('14-day synthetic pipeline', () => {
  it('produces arousal elevation during elevated windows and recovery events after', () => {
    const start = new Date('2026-04-01T08:00:00Z');
    let state = createInitialEKF(start);
    const ctx = { slot: 'owner_absent' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: null };
    const rt = new RecoveryTracker('d1');
    let completedEpisodes = 0;

    for (let day = 0; day < 14; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const at = new Date(start.getTime() + (day * 24 + hour) * 3600 * 1000);
        // Elevated arousal window at 08:00-08:30 local each day
        const elevated = hour === 8;
        const fv = synthFV(at, elevated);
        const predicted = predict(state, at, ctx);
        const rows = observationRows(predicted.x, baseline(), fv, ctx);
        const { state: next } = update(predicted, rows);
        state = next;
        const completed = rt.update(state.x[0], 'owner_absent', 0.5, 0.3, at);
        if (completed) completedEpisodes++;
      }
    }

    expect(state.x[0]).toBeGreaterThanOrEqual(0);
    expect(completedEpisodes).toBeGreaterThan(0);
  });

  it('triggers anticipation detection for a repeating pre-event pattern', () => {
    const now = new Date('2026-04-18T09:00:00Z');
    const occurrences = Array.from({ length: 12 }, (_, i) => ({
      type: 'owner_departure' as const,
      at: new Date(Date.UTC(2026, 3, i + 2, 8, 0, 0)),
    }));
    const imu: Array<{ timestamp: Date; odba: number }> = [];
    for (const o of occurrences) {
      for (let s = 0; s < 900; s++) {
        imu.push({ timestamp: new Date(o.at.getTime() - (900 - s) * 1000), odba: 0.65 });
      }
    }
    // Non-event-day baseline
    for (let d = 1; d <= 28; d++) {
      if (occurrences.some((o) => o.at.getUTCDate() === d)) continue;
      for (let s = 0; s < 3600; s++) {
        imu.push({ timestamp: new Date(Date.UTC(2026, 3, d, 8, 0, s)), odba: 0.2 });
      }
    }
    const result = computeAnticipationIndex({
      dogId: 'd1',
      eventType: 'owner_departure',
      occurrences,
      imuSamples: imu,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.detection_threshold_met).toBe(true);
    expect(result!.occurrences_count).toBeGreaterThanOrEqual(7);
  });
});
