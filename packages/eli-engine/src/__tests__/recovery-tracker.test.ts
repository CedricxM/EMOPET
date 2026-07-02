/**
 * Unit tests for RecoveryTracker and 4-week trend.
 */

import { describe, expect, it } from 'vitest';

import {
  RecoveryTracker,
  computeRecoveryTrend4wPct,
  updateRecoveryEMA,
} from '../dynamics/recovery-tracker.js';

function ts(iso: string): Date {
  return new Date(iso);
}

describe('RecoveryTracker', () => {
  it('detects an episode only after arousal exceeds the high threshold', () => {
    const rt = new RecoveryTracker('d1');
    const low = 0.3, high = 0.6;
    expect(rt.update(0.5, 'owner_present', high, low, ts('2026-04-18T10:00:00Z'))).toBeNull();
    expect(rt.getActiveEpisode()).toBeNull();
    expect(rt.update(0.7, 'owner_present', high, low, ts('2026-04-18T10:05:00Z'))).toBeNull();
    expect(rt.getActiveEpisode()).not.toBeNull();
  });

  it('completes an episode after 5 consecutive minutes below the low threshold', () => {
    const rt = new RecoveryTracker('d1');
    const low = 0.3, high = 0.6;
    rt.update(0.75, 'owner_absent', high, low, ts('2026-04-18T10:00:00Z'));
    rt.update(0.25, 'owner_absent', high, low, ts('2026-04-18T10:10:00Z')); // starts below
    rt.update(0.22, 'owner_absent', high, low, ts('2026-04-18T10:12:00Z'));
    const completed = rt.update(0.24, 'owner_absent', high, low, ts('2026-04-18T10:15:01Z'));
    expect(completed).not.toBeNull();
    expect(completed!.slot).toBe('owner_absent');
    // startedAt = 10:00:00, belowThresholdSince = 10:10:00 => recoveryMinutes = 10
    expect(completed!.recoveryMinutes).toBeCloseTo(10, 3);
  });

  it('resets the sustained-below timer if arousal bounces back up', () => {
    const rt = new RecoveryTracker('d1');
    const low = 0.3, high = 0.6;
    rt.update(0.8, 'owner_present', high, low, ts('2026-04-18T10:00:00Z'));
    rt.update(0.2, 'owner_present', high, low, ts('2026-04-18T10:05:00Z'));
    rt.update(0.5, 'owner_present', high, low, ts('2026-04-18T10:07:00Z')); // back above low -> reset
    const completed = rt.update(0.2, 'owner_present', high, low, ts('2026-04-18T10:11:00Z'));
    expect(completed).toBeNull();
  });
});

describe('computeRecoveryTrend4wPct', () => {
  it('returns null with fewer than 4 samples in the trailing 28d', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const samples = [{ recoveryMinutes: 10, timestamp: new Date('2026-04-01T00:00:00Z') }];
    expect(computeRecoveryTrend4wPct(samples, now)).toBeNull();
  });

  it('returns positive % when second half is higher than first half', () => {
    const now = new Date('2026-04-18T00:00:00Z');
    const samples = [
      // first half (day 28..15 ago): mean 10
      { recoveryMinutes: 10, timestamp: new Date('2026-03-25T00:00:00Z') },
      { recoveryMinutes: 10, timestamp: new Date('2026-03-28T00:00:00Z') },
      // second half (day 14..now): mean 20
      { recoveryMinutes: 20, timestamp: new Date('2026-04-10T00:00:00Z') },
      { recoveryMinutes: 20, timestamp: new Date('2026-04-15T00:00:00Z') },
    ];
    const pct = computeRecoveryTrend4wPct(samples, now)!;
    expect(pct).toBeCloseTo(100, 1);
  });
});

describe('updateRecoveryEMA', () => {
  it('initializes on the first sample', () => {
    const r = updateRecoveryEMA({ mean: null, std: null, sample_count: 0 }, 12);
    expect(r.mean).toBe(12);
    expect(r.std).toBe(0);
    expect(r.sample_count).toBe(1);
  });

  it('moves mean toward the new sample at alpha=0.1', () => {
    const r = updateRecoveryEMA({ mean: 10, std: 1, sample_count: 5 }, 20);
    expect(r.mean).toBeCloseTo(0.9 * 10 + 0.1 * 20, 5);
    expect(r.sample_count).toBe(6);
  });
});
