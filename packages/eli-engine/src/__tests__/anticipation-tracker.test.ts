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

  // Characterisation, not endorsement (#89). The existing fixtures place every
  // occurrence exactly on the hour, where the UTC bucket and the documented
  // "+/-30 min of the mode hour" are indistinguishable. These two cases use
  // off-the-hour times and pin what the bucket actually does, so that
  // implementing the documented rule shows up as a deliberate change here
  // rather than as a silent behaviour shift.
  it('CHARACTERISATION: splits a tight cluster that straddles two hour buckets', () => {
    // Eight departures within a 30-minute band around 08:00 — a very regular
    // routine by the documented rule, yet only 4/8 share the modal bucket.
    const occ = [
      new Date(Date.UTC(2026, 3, 1, 7, 45)), new Date(Date.UTC(2026, 3, 2, 7, 50)),
      new Date(Date.UTC(2026, 3, 3, 7, 55)), new Date(Date.UTC(2026, 3, 4, 7, 58)),
      new Date(Date.UTC(2026, 3, 5, 8, 2)), new Date(Date.UTC(2026, 3, 6, 8, 5)),
      new Date(Date.UTC(2026, 3, 7, 8, 10)), new Date(Date.UTC(2026, 3, 8, 8, 14)),
    ].map((at) => ({ type: 'owner_departure' as const, at }));
    // 4 in bucket 7 and 4 in bucket 8 => coverage 0.5 exactly, and the mode is
    // whichever bucket is reached first. One more early departure would drop it
    // below the 50% gate and reject a routine the documented rule calls narrow.
    expect(detectRecurringHour(occ)!.coverage).toBeCloseTo(0.5, 5);
  });

  it('CHARACTERISATION: accepts a loose cluster spread across one hour bucket', () => {
    // Eight departures spread over 08:00-08:55 — a 55-minute spread, outside
    // the documented +/-30 min window for half of them, yet coverage is 1.0.
    const occ = [0, 8, 16, 24, 32, 40, 48, 55].map((min, i) => ({
      type: 'owner_departure' as const,
      at: new Date(Date.UTC(2026, 3, i + 1, 8, min)),
    }));
    const r = detectRecurringHour(occ)!;
    expect(r.hour).toBe(8);
    expect(r.coverage).toBe(1);
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
