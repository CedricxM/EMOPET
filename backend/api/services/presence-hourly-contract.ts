export type PresenceMeasuredState<T> =
  | { state: 'MEASURED'; value: T }
  | { state: 'SOURCE_NOT_APPLICABLE' }
  | { state: 'SOURCE_MISSING' }
  | { state: 'SOURCE_INVALID' }
  | { state: 'SOURCE_SUPPRESSED' };

export interface PresenceSourceWindowV1 {
  schemaVersion: 'presence-source-window-v1';
  dogId: string;
  deviceId: string;
  source: 'MAT' | 'TAG';
  sourceWindowId: string;
  windowStart: Date;
  windowEnd: Date;
  /** Explicit temporal coverage, never inferred from row count. */
  coveredSeconds: number;
  firmwareVersion: string;
  summaryContractVersion: string;
  vocalEvents: PresenceMeasuredState<number>;
  agitationEvents: PresenceMeasuredState<number>;
  matPresenceMinutes: PresenceMeasuredState<number>;
}

export interface PresenceComparisonJoinCandidate {
  schemaVersion: 'presence-comparison-join-v1';
  dogId: string;
  /**
   * Stable joined-window identity. The exact bucketing/timezone algorithm is
   * still open under #133 and is not created by this type.
   */
  comparisonWindowId: string;
  windowStart: Date;
  windowEnd: Date;
  presenceState: 'present' | 'absence' | 'UNKNOWN';
  tag: PresenceSourceWindowV1 | null;
  mat: PresenceSourceWindowV1 | null;
}

export type PresenceWindowValidation =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Enforces source semantics only. It does not decide hour bucketing, joins,
 * rates or publication thresholds.
 */
export function validatePresenceSourceWindow(
  window: PresenceSourceWindowV1,
): PresenceWindowValidation {
  const durationMs = window.windowEnd.getTime() - window.windowStart.getTime();
  if (!Number.isFinite(window.coveredSeconds) || window.coveredSeconds <= 0) {
    return { valid: false, reason: 'coverage_must_be_explicit_positive_duration' };
  }
  if (durationMs <= 0) {
    return { valid: false, reason: 'invalid_window_bounds' };
  }
  if (window.coveredSeconds * 1000 > durationMs) {
    return { valid: false, reason: 'coverage_exceeds_window' };
  }

  if (window.source === 'MAT') {
    if (window.vocalEvents.state === 'MEASURED' || window.agitationEvents.state === 'MEASURED') {
      return { valid: false, reason: 'mat_cannot_measure_tag_only_behavior_fields' };
    }
  }

  if (window.source === 'TAG' && window.matPresenceMinutes.state === 'MEASURED') {
    return { valid: false, reason: 'tag_cannot_measure_mat_presence' };
  }

  return { valid: true };
}
