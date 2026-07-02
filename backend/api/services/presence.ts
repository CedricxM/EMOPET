import type { SensorSummary } from '@emopet/shared';

export type PresenceSource = 'phone_passive' | 'manual_override';
export type PresenceState = 'present' | 'absence';
export type PresenceGate = 'PUBLISH' | 'DEGRADE' | 'REJECT';

export interface PresenceEventInput {
  phoneSeen: boolean;
  timestamp: Date | string;
  rssi?: number;
  source?: PresenceSource;
}

export interface PresenceSegment {
  state: PresenceState;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  source: PresenceSource;
}

export interface PresenceComparison {
  present_vocal_events_per_hour: number;
  absent_vocal_events_per_hour: number;
  present_imu_agitation_index_mean: number;
  absent_imu_agitation_index_mean: number;
  present_mat_rest_min: number;
  absent_mat_rest_min: number;
  effect_size: number;
  confidence: number;
  gate: PresenceGate;
  segments: PresenceSegment[];
  valid_absence_hours: number;
  valid_presence_hours: number;
}

const presenceEventStore = new Map<string, PresenceEventInput[]>();

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function buildPresenceSegments(events: PresenceEventInput[]): PresenceSegment[] {
  const sorted = events
    .map((event) => ({
      ...event,
      timestamp: toDate(event.timestamp),
      source: event.source ?? 'phone_passive',
    }))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

  if (sorted.length < 2) {
    return [];
  }

  const segments: PresenceSegment[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index]!;
    const next = sorted[index + 1]!;
    const durationMinutes = Math.max(
      0,
      (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60),
    );

    if (durationMinutes <= 0) {
      continue;
    }

    segments.push({
      state: current.phoneSeen ? 'present' : 'absence',
      startedAt: current.timestamp,
      endedAt: next.timestamp,
      durationMinutes: round(durationMinutes),
      source: current.source,
    });
  }

  return segments;
}

function findSegmentForDate(
  segments: PresenceSegment[],
  at: Date,
): PresenceSegment | undefined {
  return segments.find(
    (segment) =>
      segment.startedAt.getTime() <= at.getTime() && segment.endedAt.getTime() > at.getTime(),
  );
}

function normalizeSensorSummary(
  summary: Partial<SensorSummary> & { timestamp: Date | string },
): Partial<SensorSummary> & { timestamp: Date } {
  return {
    ...summary,
    timestamp: toDate(summary.timestamp),
  };
}

function computeGate(
  validPresenceHours: number,
  validAbsenceHours: number,
  confidence: number,
): PresenceGate {
  if (validPresenceHours < 2 || validAbsenceHours < 2) {
    return 'REJECT';
  }

  if (validPresenceHours < 4 || validAbsenceHours < 4 || confidence < 0.6) {
    return 'DEGRADE';
  }

  return 'PUBLISH';
}

export function computePresenceComparison(
  summaries: Array<Partial<SensorSummary> & { timestamp: Date | string }>,
  events: PresenceEventInput[],
): PresenceComparison {
  const segments = buildPresenceSegments(events);
  const normalizedSummaries = summaries.map(normalizeSensorSummary);

  const presentVocal: number[] = [];
  const absentVocal: number[] = [];
  const presentAgitation: number[] = [];
  const absentAgitation: number[] = [];
  const presentRest: number[] = [];
  const absentRest: number[] = [];

  for (const summary of normalizedSummaries) {
    const segment = findSegmentForDate(segments, summary.timestamp);
    if (!segment) {
      continue;
    }

    const vocal = summary.vocalEvents ?? 0;
    const agitation = summary.agitationEvents ?? 0;
    const rest = summary.matPresenceMinutes ?? 0;

    if (segment.state === 'present') {
      presentVocal.push(vocal);
      presentAgitation.push(agitation);
      presentRest.push(rest);
    } else {
      absentVocal.push(vocal);
      absentAgitation.push(agitation);
      absentRest.push(rest);
    }
  }

  const present_vocal_events_per_hour = round(mean(presentVocal));
  const absent_vocal_events_per_hour = round(mean(absentVocal));
  const present_imu_agitation_index_mean = round(mean(presentAgitation));
  const absent_imu_agitation_index_mean = round(mean(absentAgitation));
  const present_mat_rest_min = round(mean(presentRest));
  const absent_mat_rest_min = round(mean(absentRest));

  const vocalDelta = absent_vocal_events_per_hour - present_vocal_events_per_hour;
  const agitationDelta = absent_imu_agitation_index_mean - present_imu_agitation_index_mean;
  const restDelta = present_mat_rest_min - absent_mat_rest_min;
  const effect_size = round((Math.max(vocalDelta, 0) + Math.max(agitationDelta, 0) + Math.max(restDelta / 10, 0)) / 3);

  const valid_presence_hours = presentVocal.length;
  const valid_absence_hours = absentVocal.length;
  const coverageScore = Math.min(1, (valid_presence_hours + valid_absence_hours) / 10);
  const balanceScore =
    valid_presence_hours === 0 || valid_absence_hours === 0
      ? 0
      : Math.min(valid_presence_hours, valid_absence_hours)
        / Math.max(valid_presence_hours, valid_absence_hours);
  const confidence = round((coverageScore * 0.6) + (balanceScore * 0.4));

  return {
    present_vocal_events_per_hour,
    absent_vocal_events_per_hour,
    present_imu_agitation_index_mean,
    absent_imu_agitation_index_mean,
    present_mat_rest_min,
    absent_mat_rest_min,
    effect_size,
    confidence,
    gate: computeGate(valid_presence_hours, valid_absence_hours, confidence),
    segments,
    valid_absence_hours,
    valid_presence_hours,
  };
}

export function appendPresenceEvents(dogId: string, events: PresenceEventInput[]): void {
  const existing = presenceEventStore.get(dogId) ?? [];
  presenceEventStore.set(dogId, [...existing, ...events]);
}

export function getPresenceEventsForDog(
  dogId: string,
  since?: Date,
): PresenceEventInput[] {
  const events = presenceEventStore.get(dogId) ?? [];
  if (!since) {
    return events;
  }

  return events.filter((event) => toDate(event.timestamp).getTime() >= since.getTime());
}
