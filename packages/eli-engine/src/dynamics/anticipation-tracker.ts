/**
 * AnticipationTracker â€” detects pre-event activity elevation for recurring
 * events in the dog's routine (owner departure, walk, meal).
 *
 * Detection rule (current implementation; scientific/product authority remains open under #89):
 *   - >=7 occurrences of the event type in trailing 30 days
 *   - mode hour-of-day covers >=50% of occurrences within Â±30 minutes
 *   - For each predicted upcoming occurrence, compute:
 *       ratio = mean(ODBA in [T-15min, T]) / mean(ODBA at same hour on
 *                 non-event days for the trailing 30d)
 *   - detection_threshold_met = ratio > 1.5 AND occurrences_count >= 7
 *
 * Evidence boundary (#89): McEwen (1998, Ann NY Acad Sci) and Homma &
 * Masaoka (2008, Exp Physiol) provide conceptual physiology context only.
 * They do not establish EMOPET's 30 d / 7-event / 50% / 15 min / 1.5
 * detector constants. Those values are EMOPET engineering hypotheses
 * until prospectively validated.
 */

import type { AnticipationDetected, AnticipationEventType } from '@emopet/shared';

export interface EventOccurrence {
  type: AnticipationEventType;
  at: Date;
}

export interface ImuSample {
  timestamp: Date;
  odba: number;
}

export interface AnticipationInput {
  dogId: string;
  eventType: AnticipationEventType;
  occurrences: EventOccurrence[];   // trailing 30d for this event type
  imuSamples: ImuSample[];           // trailing 30d, 1 Hz
  now: Date;
}

export const MIN_OCCURRENCES = 7;
export const RATIO_THRESHOLD = 1.5;
export const PRE_EVENT_WINDOW_MIN = 15;

/**
 * Detect whether the typical recurrence hour-of-day is narrow enough to
 * yield a predictable event time. Returns { hour, coverage } when at
 * least 50% of occurrences fall within Â±30 min of the mode hour.
 */
export function detectRecurringHour(
  occurrences: EventOccurrence[],
): { hour: number; coverage: number } | null {
  if (occurrences.length < MIN_OCCURRENCES) return null;
  const hours = occurrences.map((o) => o.at.getUTCHours());
  const counts = new Array(24).fill(0) as number[];
  for (const h of hours) counts[h] = (counts[h] ?? 0) + 1;
  let modeHour = 0;
  let modeCount = 0;
  for (let h = 0; h < 24; h++) {
    if (counts[h]! > modeCount) {
      modeCount = counts[h]!;
      modeHour = h;
    }
  }
  // APPROXIMATION, not an equivalence (#89). This is the share of occurrences
  // falling in the modal UTC hour bucket, which is NOT the documented "within
  // +/-30 min of the mode hour": 07:45 and 08:15 are 30 min apart and land in
  // different buckets, while 08:05 and 08:55 are 50 min apart and share one.
  // The bucket therefore splits tight clusters and merges loose ones. Bucketing
  // is also in UTC for a local-time behaviour, so a window crossing a DST
  // change can split across two buckets with no change in the dog's routine.
  // Do not change this without #89: it moves the eligibility gate.
  const coverage = modeCount / occurrences.length;
  if (coverage < 0.5) return null;
  return { hour: modeHour, coverage };
}

/**
 * Compute the activity ratio for a single predicted event time.
 * Returns null if insufficient pre-event or baseline samples.
 */
export function activityRatioForEvent(
  predictedEventTime: Date,
  occurrences: EventOccurrence[],
  imuSamples: ImuSample[],
): number | null {
  const preStart = new Date(predictedEventTime.getTime() - PRE_EVENT_WINDOW_MIN * 60_000);
  const pre = imuSamples.filter((s) => s.timestamp >= preStart && s.timestamp <= predictedEventTime);
  if (pre.length < (PRE_EVENT_WINDOW_MIN * 60) * 0.5) return null; // <50% coverage at 1 Hz

  const targetHour = predictedEventTime.getUTCHours();
  // Baseline: same hour-of-day, on days with NO occurrence of this event type.
  const eventDays = new Set(
    occurrences.map((o) => o.at.toISOString().slice(0, 10)),
  );
  const baselineSamples = imuSamples.filter((s) => {
    const day = s.timestamp.toISOString().slice(0, 10);
    return s.timestamp.getUTCHours() === targetHour && !eventDays.has(day);
  });
  if (baselineSamples.length === 0) return null;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const pre_mean = mean(pre.map((s) => s.odba));
  const base_mean = mean(baselineSamples.map((s) => s.odba));
  if (base_mean < 1e-3) return null;
  return pre_mean / base_mean;
}

/**
 * Run the full anticipation detector on a dog's trailing 30d of
 * occurrences and IMU samples.
 */
export function computeAnticipationIndex(
  input: AnticipationInput,
): AnticipationDetected | null {
  const { occurrences, imuSamples, now } = input;
  const recurring = detectRecurringHour(occurrences);
  if (!recurring) return null;

  // Build a predicted event time for today at the mode hour
  const predicted = new Date(now);
  predicted.setUTCHours(recurring.hour, 0, 0, 0);

  const predictedRatio = activityRatioForEvent(predicted, occurrences, imuSamples);
  const historicalRatios: number[] = [];

  // Count observed windows where the ratio was met. If today's predicted
  // window has no samples yet, use the latest observed ratio as the current
  // estimate instead of producing certainty from missing data.
  for (const occ of occurrences) {
    const r = activityRatioForEvent(occ.at, occurrences, imuSamples);
    if (r != null) historicalRatios.push(r);
  }

  const ratio = predictedRatio ?? historicalRatios[historicalRatios.length - 1];
  if (ratio == null) return null;

  const hits = historicalRatios.filter((r) => r > RATIO_THRESHOLD).length;

  return {
    event_type: input.eventType,
    pre_event_window_minutes: 15,
    activity_ratio: ratio,
    event_occurrence_count: occurrences.length,
    above_threshold_hit_count: hits,
    // Backward-compatible alias. New consumers must use the explicit fields.
    occurrences_count: hits,
    detection_threshold_met: ratio > RATIO_THRESHOLD && hits >= MIN_OCCURRENCES,
  };
}



