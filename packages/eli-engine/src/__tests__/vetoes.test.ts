/**
 * Unit tests for the veto pipeline, with focus on V11 HIGH_ANIMAL_INTERACTION.
 */

import { describe, expect, it } from 'vitest';

import type { FeatureVector } from '@emopet/shared';
import {
  VETO_IDS,
  VETO_PIPELINE,
  runVetoPipeline,
  veto_v11_high_animal_interaction,
} from '../vetoes/index.js';

function fv(overrides: Partial<FeatureVector> = {}): FeatureVector {
  return {
    timestamp: new Date('2026-04-18T12:00:00Z'),
    dogId: 'd1',
    deviceSource: 'TAG',
    firmwareVersion: '6.0.0',
    rr_mean: 25,
    rr_confidence: 0.9,
    rr_variability: 0.2,
    odba_mean: 0.3,
    activity_minutes_pct: 0.2,
    activity_variability: 0.3,
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

const ctx = {
  dogId: 'd1',
  minutes_since_high_activity: 60,
  minutes_since_return_home: 60,
  minutes_since_meal: 60,
  collar_orientation_quality: 0.9,
  ambient_noise_db: 40,
  mat_weight_kg: 10,
  dog_weight_kg: 10,
  is_brachycephalic: false,
  heat_alert_threshold_c: 25,
  estrous_window: false,
};

describe('veto_v11_high_animal_interaction', () => {
  it('allows when fewer than 3 of 4 conditions are met', () => {
    const d = veto_v11_high_animal_interaction(fv({ lateral_acc_rms: 0.7, odba_mean: 3.2 }), ctx);
    expect(d.action).toBe('ALLOW');
  });

  it('denies when 3 of 4 conditions are met (lateral, ODBA, gyro)', () => {
    const d = veto_v11_high_animal_interaction(
      fv({ lateral_acc_rms: 0.7, odba_mean: 3.2, gyro_std_deg_s: 250 }),
      ctx,
    );
    expect(d.action).toBe('DENY');
    expect(d.veto_id).toBe('V11_HIGH_ANIMAL_INTERACTION');
    expect(d.cooldown_minutes).toBe(5);
  });

  it('denies when 3 of 4 conditions are met (lateral, gyro, vocal)', () => {
    const d = veto_v11_high_animal_interaction(
      fv({ lateral_acc_rms: 0.7, gyro_std_deg_s: 250, vocal_event_in_window: true }),
      ctx,
    );
    expect(d.action).toBe('DENY');
  });

  it('allows when lateral_acc_rms is null (no data)', () => {
    const d = veto_v11_high_animal_interaction(
      fv({ lateral_acc_rms: null, odba_mean: 3.2, gyro_std_deg_s: 250, vocal_event_in_window: true }),
      ctx,
    );
    expect(d.action).toBe('ALLOW');
  });
});

describe('pipeline layout', () => {
  it('exposes all 11 vetoes in order, V11 last', () => {
    expect(VETO_IDS).toHaveLength(11);
    expect(VETO_IDS[10]).toBe('V11_HIGH_ANIMAL_INTERACTION');
    expect(VETO_PIPELINE).toHaveLength(11);
  });

  it('stops the pipeline on the first DENY', () => {
    const result = runVetoPipeline(
      fv({ lateral_acc_rms: 0.7, odba_mean: 3.2, gyro_std_deg_s: 250 }),
      ctx,
    );
    expect(result.denyingVeto).toBe('V11_HIGH_ANIMAL_INTERACTION');
  });

  it('accumulates MODIFY suppressions without denying', () => {
    const result = runVetoPipeline(fv(), { ...ctx, ambient_noise_db: 90 });
    expect(result.denyingVeto).toBeNull();
    expect(result.suppress).toContain('mic');
  });
});
