import { createHash } from 'node:crypto';

import type { SecurityDetection } from './security-anomaly-detection.js';
import type { SecurityAuditEvent } from './security-audit-event.js';

export interface SecurityDetectionSourceEvent {
  id: string;
  event: SecurityAuditEvent;
}

export interface SecurityDetectionEvidence {
  detection: SecurityDetection;
  sourceEventIds: readonly string[];
}

export interface SecurityDetectionHistoryRecord {
  dedupeKey: string;
  detectorType: SecurityDetection['type'];
  policyRevision: string;
  evaluationWindowStart: string;
  evaluationWindowEnd: string;
  eventCount: number | null;
  uniqueTargetCount: number | null;
  sourceEventIds: readonly string[];
}

function actorKey(event: SecurityAuditEvent): string | null {
  if (event.actor.kind === 'anonymous') return null;
  return `${event.actor.kind}:${event.actor.subject}`;
}

function eventTime(event: SecurityAuditEvent): number {
  return Date.parse(event.occurredAt);
}

function canonicalPairs(
  values: readonly SecurityDetectionSourceEvent[],
): SecurityDetectionSourceEvent[] {
  return [...values].sort((left, right) => {
    const timeDelta = eventTime(left.event) - eventTime(right.event);
    if (timeDelta !== 0) return timeDelta;

    const eventDelta = JSON.stringify(left.event)
      .localeCompare(JSON.stringify(right.event));
    if (eventDelta !== 0) return eventDelta;

    return left.id.localeCompare(right.id);
  });
}

function repeatedDenialSources(
  pairs: readonly SecurityDetectionSourceEvent[],
  detection: Extract<SecurityDetection, { type: 'repeated_privileged_denials' }>,
): string[] | null {
  const candidates = pairs.filter(({ event }) => (
    event.eventType === 'privileged_authority_decision'
    && event.outcome === 'denied'
    && actorKey(event) === detection.actorKey
    && event.occurredAt >= detection.windowStart
    && event.occurredAt <= detection.windowEnd
  ));

  const selected = candidates.slice(0, detection.count);
  if (
    selected.length !== detection.count
    || selected[0]?.event.occurredAt !== detection.windowStart
    || selected[selected.length - 1]?.event.occurredAt !== detection.windowEnd
  ) {
    return null;
  }

  return selected.map(({ id }) => id);
}

function rapidMultiTargetSources(
  pairs: readonly SecurityDetectionSourceEvent[],
  detection: Extract<SecurityDetection, { type: 'rapid_multi_target_access' }>,
): string[] | null {
  const candidates = pairs.filter(({ event }) => (
    event.eventType === 'privileged_sensitive_access'
    && event.outcome === 'allowed'
    && event.actor.kind === 'privileged_human'
    && event.target.ref !== null
    && actorKey(event) === detection.actorKey
    && event.occurredAt >= detection.windowStart
    && event.occurredAt <= detection.windowEnd
  ));

  const selected: SecurityDetectionSourceEvent[] = [];
  const targets = new Set<string>();

  for (const candidate of candidates) {
    selected.push(candidate);
    const ref = candidate.event.target.ref;
    if (ref !== null) {
      targets.add(`${candidate.event.target.scope}:${ref}`);
    }
    if (targets.size >= detection.uniqueTargetCount) break;
  }

  if (
    targets.size !== detection.uniqueTargetCount
    || selected[0]?.event.occurredAt !== detection.windowStart
    || selected[selected.length - 1]?.event.occurredAt !== detection.windowEnd
  ) {
    return null;
  }

  return selected.map(({ id }) => id);
}

function machineAttemptCandidates(
  pairs: readonly SecurityDetectionSourceEvent[],
  detection: Extract<
    SecurityDetection,
    { type: 'machine_privileged_authority_attempt' }
  >,
): SecurityDetectionSourceEvent[] {
  return pairs.filter(({ event }) => (
    event.eventType === 'privileged_authority_decision'
    && event.actor.kind === 'machine'
    && event.outcome === 'denied'
    && event.reason === 'machine_principal_not_supported'
    && actorKey(event) === detection.actorKey
    && event.occurredAt === detection.occurredAt
  ));
}

/**
 * Reconcile detector output back to the exact canonical audit rows that formed
 * each detection. actorKey remains transient and is never returned as durable
 * evidence.
 */
export function mapSecurityDetectionEvidence(
  sourceEvents: readonly SecurityDetectionSourceEvent[],
  detections: readonly SecurityDetection[],
): readonly SecurityDetectionEvidence[] | null {
  const pairs = canonicalPairs(sourceEvents);
  const machineOffsets = new Map<string, number>();
  const evidence: SecurityDetectionEvidence[] = [];

  for (const detection of detections) {
    let sourceEventIds: string[] | null = null;

    if (detection.type === 'repeated_privileged_denials') {
      sourceEventIds = repeatedDenialSources(pairs, detection);
    } else if (detection.type === 'rapid_multi_target_access') {
      sourceEventIds = rapidMultiTargetSources(pairs, detection);
    } else {
      const key = `${detection.actorKey}\u0000${detection.occurredAt}`;
      const candidates = machineAttemptCandidates(pairs, detection);
      const offset = machineOffsets.get(key) ?? 0;
      const candidate = candidates[offset];
      if (candidate) {
        sourceEventIds = [candidate.id];
        machineOffsets.set(key, offset + 1);
      }
    }

    if (!sourceEventIds || sourceEventIds.length === 0) return null;

    evidence.push({
      detection,
      sourceEventIds,
    });
  }

  return evidence;
}

function metricShape(detection: SecurityDetection): {
  eventCount: number | null;
  uniqueTargetCount: number | null;
  metricKey: string;
} {
  if (detection.type === 'repeated_privileged_denials') {
    return {
      eventCount: detection.count,
      uniqueTargetCount: null,
      metricKey: `event_count:${detection.count}`,
    };
  }
  if (detection.type === 'rapid_multi_target_access') {
    return {
      eventCount: null,
      uniqueTargetCount: detection.uniqueTargetCount,
      metricKey: `unique_target_count:${detection.uniqueTargetCount}`,
    };
  }
  return {
    eventCount: null,
    uniqueTargetCount: null,
    metricKey: 'metric:none',
  };
}

export function buildSecurityDetectionHistoryRecords(input: {
  policyRevision: string;
  evaluationWindowStart: string;
  evaluationWindowEnd: string;
  evidence: readonly SecurityDetectionEvidence[];
}): readonly SecurityDetectionHistoryRecord[] {
  return input.evidence.map(({ detection, sourceEventIds }) => {
    const sortedIds = [...sourceEventIds].sort();
    const metric = metricShape(detection);
    const dedupeKey = createHash('sha256')
      .update([
        'security-detection-history-v1',
        input.policyRevision,
        detection.type,
        metric.metricKey,
        ...sortedIds,
      ].join('\n'))
      .digest('hex');

    return {
      dedupeKey,
      detectorType: detection.type,
      policyRevision: input.policyRevision,
      evaluationWindowStart: input.evaluationWindowStart,
      evaluationWindowEnd: input.evaluationWindowEnd,
      eventCount: metric.eventCount,
      uniqueTargetCount: metric.uniqueTargetCount,
      sourceEventIds: sortedIds,
    };
  });
}
