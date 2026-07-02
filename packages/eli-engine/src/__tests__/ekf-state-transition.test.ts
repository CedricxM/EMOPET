/**
 * Tests for state-transition α_L modulation (v6).
 */

import { describe, expect, it } from 'vitest';

import {
  effectiveLoadDecayPerDay,
  LOAD_DECAY_PER_DAY_BASE,
  LOAD_DECAY_TREND_MULTIPLIER,
} from '../ekf/state-transition.js';

describe('effectiveLoadDecayPerDay (v6 α_L modulation)', () => {
  it('returns the base rate when recovery trend is flat', () => {
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: 5 };
    expect(effectiveLoadDecayPerDay(ctx)).toBe(LOAD_DECAY_PER_DAY_BASE);
  });

  it('slows decay when recovery trend > +20%', () => {
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: 25 };
    expect(effectiveLoadDecayPerDay(ctx)).toBeCloseTo(
      LOAD_DECAY_PER_DAY_BASE / LOAD_DECAY_TREND_MULTIPLIER,
      9,
    );
  });

  it('falls back to base when trend data is missing', () => {
    const ctx = { slot: 'owner_present' as const, sensorNoiseMultiplier: 1, recoveryTrend4wPct: null };
    expect(effectiveLoadDecayPerDay(ctx)).toBe(LOAD_DECAY_PER_DAY_BASE);
  });
});
