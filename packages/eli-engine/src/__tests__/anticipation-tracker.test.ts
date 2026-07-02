/**
 * Unit tests for the anticipation_index detector.
 */

import { describe, expect, it } from 'vitest';

import {
  computeAnticipationIndex,
  detectRecurringHour,
  activityRatioForEvent,
} from '../dynamics/anticipation-tracker.js';

function dayAt(dayOfMonth: number, hour: number): Date {
  return new Date(Date.UTC(2026, 3, dayOfMonth, hour, 0, 0));
}

describe('detectRecurringHour', () => {
  it('returns null below the 7-occurrence minimum', () => {
    const occ = [1, 2, 3].map((d) => ({ type: 'owner_departure' as const, at: dayAt(d, 8) }));
    expect(detectRecurringHour(occ)).toBeNull();
  });

  it('returns the mode hour when coverage >= 50%', () => {
    const occ = Array.from({ length: 10 }, (_, i) => ({
      type: 'owner_departure' as const,
      at: dayAt(i + 1, i < 7 ? 8 : 12),
    }));
    const r = detectRecurringHour(occ)!;
    expect(r.hour).toBe(8);
    expect(r.coverage).toBeGreaterThanOrEqual(0.5);
  });
});

describe('activityRatioForEvent', () => {
  it('returns a ratio > 1 when pre-event ODBA exceeds baseline ODBA', () => {
    const predicted = dayAt(15, 8);
    // Dense pre-event samples elevated
    const pre = Array.from({ length: 600 }, (_, i) => ({
      timestamp: new Date(predicted.getTime() - (600 - i) * 1000),
      odba: 0.5,
    }));
    // Non-event-day baseline: same hour-of-day, lower ODBA
    const base = Array.from({ length: 3600 }, (_, i) => ({
      timestamp: new Date(Date.UTC(2026, 2, 10, 8, 0, i)),
      odba: 0.25,
    }));
    const occ = [{ type: 'owner_departure' as const, at: predicted }];
    const ratio = activityRatioForEvent(predicted, occ, [...pre, ...base])!;
    expect(ratio).toBeCloseTo(0.5 / 0.25, 1);
  });
});

describe('computeAnticipationIndex', () => {
  it('emits detection_threshold_met when ratio>1.5 and occurrences>=7', () => {
    const now = dayAt(18, 9);
    const occ = Array.from({ length: 10 }, (_, i) => ({
      type: 'owner_departure' as const,
      at: dayAt(2 + i, 8),
    }));
    const imu: Array<{ timestamp: Date; odba: number }> = [];
    // For each occurrence, add 15 min of high ODBA right before it
    for (const o of occ) {
      for (let i = 0; i < 900; i++) {
        imu.push({ timestamp: new Date(o.at.getTime() - (900 - i) * 1000), odba: 0.6 });
      }
    }
    // Non-event-day baseline at hour 8
    for (let d = 1; d <= 28; d++) {
      const isEventDay = occ.some((o) => o.at.getUTCDate() === d);
      if (isEventDay) continue;
      for (let s = 0; s < 3600; s++) {
        imu.push({ timestamp: new Date(Date.UTC(2026, 3, d, 8, 0, s)), odba: 0.2 });
      }
    }
    const r = computeAnticipationIndex({
      dogId: 'd1',
      eventType: 'owner_departure',
      occurrences: occ,
      imuSamples: imu,
      now,
    });
    expect(r).not.toBeNull();
    expect(r!.activity_ratio).toBeGreaterThan(1.5);
    expect(r!.detection_threshold_met).toBe(true);
  });
});
