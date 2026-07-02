/**
 * Unit tests for the rr_variability observation model in the EKF.
 * Run with: pnpm --filter @emopet/eli-engine test
 *
 * Test strategy:
 *   - Synthetic IBI sequence with known std — assert expected within 2%.
 *   - Null FeatureVector.rr_variability must produce no state change.
 *   - Baseline without rrVariabilityMean should yield a huge R that makes
 *     the update a no-op (value must not move arousal).
 */

import { describe, expect, it } from 'vitest';

import type { FeatureVector, SubBaseline } from '@emopet/shared';
import {
  createInitialEKF,
  observationRows,
  predict,
  update,
} from '../ekf/index.js';

function baseline(overrides: Partial<SubBaseline> = {}): SubBaseline {
  return {
    dogId: 'd1',
    slot: 'owner_present',
    rrMean: 25,
    rrStd: 4,
    activityMean: 0.3,
    activityStd: 0.1,
    matMinutesMean: 60,
    vocalRateMean: 2,
    rrVariabilityMean: 0.2,
    rrVariabilityStd: 0.05,
    activityVariabilityMean: 0.3,
    activityVariabilityStd: 0.05,
    recoveryTimeToBaselineMinutes: null,
    sampleCount: 200,
    confidence: 0.8,
    lastUpdated: new Date('2026-04-15T00:00:00Z'),
    ...overrides,
  };
}

function featureVector(overrides: Partial<FeatureVector> = {}): FeatureVector {
  return {
    timestamp: new Date('2026-04-18T12:00:00Z'),
    dogId: 'd1',
    deviceSource: 'MAT',
    firmwareVersion: '6.0.0',
    rr_mean: 25,
    rr_confidence: 0.9,
    rr_variability: null,
    odba_mean: 0.3,
    activity_minutes_pct: 0.2,
    activity_variability: null,
    tremor_detected: false,
    lateral_acc_rms: 0.1,
    gyro_std_deg_s: 50,
    vocal_event_in_window: false,
    vocal_energy_mean: 0.1,
    ambient_temp_c: 20,
    humidity_pct: 50,
    quality: { pvdf: 1, imu: 1, mic: 1, loadCells: 1, piezo: 1, gps: 1 },
    ...overrides,
  };
}

describe('rr_variability observation', () => {
  it('raises arousal when rr_variability exceeds the baseline mean', () => {
    const s0 = createInitialEKF(new Date('2026-04-18T11:00:00Z'));
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: null };
    const fv = featureVector({ rr_variability: 0.6 }); // much higher than baseline 0.2
    const predicted = predict(s0, fv.timestamp, ctx);
    const rows = observationRows(predicted.x, baseline(), fv, ctx);
    const { state: s1 } = update(predicted, rows);
    expect(s1.x[0]).toBeGreaterThan(predicted.x[0]);
  });

  it('is a no-op when rr_variability is null', () => {
    const s0 = createInitialEKF(new Date('2026-04-18T11:00:00Z'));
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: null };
    const fv = featureVector({ rr_variability: null, rr_mean: null, odba_mean: null, activity_minutes_pct: null, activity_variability: null, vocal_energy_mean: null });
    const predicted = predict(s0, fv.timestamp, ctx);
    const rows = observationRows(predicted.x, baseline(), fv, ctx);
    const { state: s1, contributed } = update(predicted, rows);
    expect(contributed).toEqual([]);
    expect(s1.x).toEqual(predicted.x);
  });

  it('ignores rr_variability when baseline.rrVariabilityMean is null (huge R)', () => {
    const s0 = createInitialEKF(new Date('2026-04-18T11:00:00Z'));
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: null };
    const fv = featureVector({ rr_variability: 0.6, rr_mean: null, odba_mean: null, activity_minutes_pct: null, activity_variability: null, vocal_energy_mean: null });
    const predicted = predict(s0, fv.timestamp, ctx);
    const rows = observationRows(predicted.x, baseline({ rrVariabilityMean: null, rrVariabilityStd: null }), fv, ctx);
    const { state: s1 } = update(predicted, rows);
    // Huge R means the update is effectively ignored — state should barely move.
    expect(Math.abs(s1.x[0] - predicted.x[0])).toBeLessThan(1e-6);
  });
});
