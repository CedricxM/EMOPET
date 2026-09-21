import type { SecurityDetection } from './security-anomaly-detection.js';

export const SECURITY_ALERT_SCHEMA_VERSION = 'security-alert-v1' as const;

export const SECURITY_ALERT_SEVERITIES = ['medium', 'high', 'critical'] as const;
export type SecurityAlertSeverity = (typeof SECURITY_ALERT_SEVERITIES)[number];

export const SECURITY_ALERT_OWNER_ROLES = ['security_duty', 'incident_commander'] as const;
export type SecurityAlertOwnerRole = (typeof SECURITY_ALERT_OWNER_ROLES)[number];

export type SecurityDetectionType = SecurityDetection['type'];

export interface SecurityAlertRoute {
  severity: SecurityAlertSeverity;
  primaryOwner: SecurityAlertOwnerRole;
  acknowledgeWithinSeconds: number;
  escalationOwner: SecurityAlertOwnerRole;
  escalateAfterSeconds: number;
}

export type SecurityAlertRoutingPolicy = Readonly<Record<SecurityDetectionType, SecurityAlertRoute>>;

export interface SecurityAlertCandidate {
  schemaVersion: typeof SECURITY_ALERT_SCHEMA_VERSION;
  sourceDetectionType: SecurityDetectionType;
  sourceActorKey: string;
  sourceOccurredAt: string;
  detectedAt: string;
  severity: SecurityAlertSeverity;
  primaryOwner: SecurityAlertOwnerRole;
  acknowledgeBy: string;
  escalationOwner: SecurityAlertOwnerRole;
  escalateAt: string;
}

export type SecurityAlertBuildResult =
  | { status: 'BUILT'; alert: SecurityAlertCandidate }
  | { status: 'INVALID_POLICY' | 'INVALID_DETECTION' | 'INVALID_TIMESTAMP'; alert: null };

export interface SecurityAlertAcknowledgement {
  acknowledgedAt: string;
  acknowledgedBy: SecurityAlertOwnerRole;
}

export type SecurityAlertResponseState = 'OPEN' | 'ACKNOWLEDGED' | 'ACK_OVERDUE' | 'ESCALATION_DUE';

export type SecurityAlertResponseEvaluation =
  | {
      status: 'INVALID_ALERT' | 'INVALID_TIMESTAMP' | 'INVALID_ACKNOWLEDGEMENT';
      state: null;
      acknowledgementLatencySeconds: null;
      acknowledgementOnTime: null;
    }
  | {
      status: 'EVALUATED';
      state: SecurityAlertResponseState;
      acknowledgementLatencySeconds: number | null;
      acknowledgementOnTime: boolean | null;
    };

const DETECTION_TYPE_SET: Readonly<Record<SecurityDetectionType, true>> = Object.freeze({
  repeated_privileged_denials: true,
  rapid_multi_target_access: true,
  machine_privileged_authority_attempt: true,
});
const DETECTION_TYPES = Object.freeze(Object.keys(DETECTION_TYPE_SET) as SecurityDetectionType[]);

const ROUTE_KEYS = Object.freeze([
  'severity',
  'primaryOwner',
  'acknowledgeWithinSeconds',
  'escalationOwner',
  'escalateAfterSeconds',
]);
const ALERT_KEYS = Object.freeze([
  'schemaVersion',
  'sourceDetectionType',
  'sourceActorKey',
  'sourceOccurredAt',
  'detectedAt',
  'severity',
  'primaryOwner',
  'acknowledgeBy',
  'escalationOwner',
  'escalateAt',
]);
const ACK_KEYS = Object.freeze(['acknowledgedAt', 'acknowledgedBy']);
const ACTOR_KEY_RE = /^[a-z_]+:[a-zA-Z0-9:._-]{1,128}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

function addSeconds(timestamp: string, seconds: number): string | null {
  const base = Date.parse(timestamp);
  const result = base + seconds * 1000;
  if (!Number.isFinite(result)) return null;
  try {
    return new Date(result).toISOString();
  } catch {
    return null;
  }
}

function parseRoute(value: unknown): SecurityAlertRoute | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ROUTE_KEYS)) return null;
  if (!includesString(SECURITY_ALERT_SEVERITIES, value.severity)) return null;
  if (!includesString(SECURITY_ALERT_OWNER_ROLES, value.primaryOwner)) return null;
  if (!includesString(SECURITY_ALERT_OWNER_ROLES, value.escalationOwner)) return null;
  if (!isPositiveSafeInteger(value.acknowledgeWithinSeconds)) return null;
  if (!isPositiveSafeInteger(value.escalateAfterSeconds)) return null;
  if (value.escalateAfterSeconds < value.acknowledgeWithinSeconds) return null;

  return {
    severity: value.severity,
    primaryOwner: value.primaryOwner,
    acknowledgeWithinSeconds: value.acknowledgeWithinSeconds,
    escalationOwner: value.escalationOwner,
    escalateAfterSeconds: value.escalateAfterSeconds,
  };
}

function parsePolicy(value: unknown): SecurityAlertRoutingPolicy | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  const expected = [...DETECTION_TYPES].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return null;

  const routes: Partial<Record<SecurityDetectionType, SecurityAlertRoute>> = {};
  for (const type of DETECTION_TYPES) {
    const route = parseRoute(value[type]);
    if (!route) return null;
    routes[type] = route;
  }

  return routes as SecurityAlertRoutingPolicy;
}

function validActorKeyForDetection(type: SecurityDetectionType, actorKey: string): boolean {
  if (!ACTOR_KEY_RE.test(actorKey)) return false;
  if (type === 'machine_privileged_authority_attempt') return actorKey.startsWith('machine:');
  if (type === 'rapid_multi_target_access') return actorKey.startsWith('privileged_human:');
  return !actorKey.startsWith('anonymous:');
}

function parseDetection(value: unknown): SecurityDetection | null {
  if (!isRecord(value) || !includesString(DETECTION_TYPES, value.type)) return null;
  if (typeof value.actorKey !== 'string' || !validActorKeyForDetection(value.type, value.actorKey)) return null;

  if (value.type === 'machine_privileged_authority_attempt') {
    if (!hasOnlyKeys(value, ['type', 'actorKey', 'occurredAt'])) return null;
    const occurredAt = canonicalUtcTimestamp(value.occurredAt);
    if (!occurredAt) return null;
    return {
      type: 'machine_privileged_authority_attempt',
      actorKey: value.actorKey,
      occurredAt,
    };
  }

  if (!hasOnlyKeys(value, [
    'type',
    'actorKey',
    'windowStart',
    'windowEnd',
    value.type === 'repeated_privileged_denials' ? 'count' : 'uniqueTargetCount',
  ])) {
    return null;
  }

  const windowStart = canonicalUtcTimestamp(value.windowStart);
  const windowEnd = canonicalUtcTimestamp(value.windowEnd);
  if (!windowStart || !windowEnd || Date.parse(windowEnd) < Date.parse(windowStart)) return null;

  if (value.type === 'repeated_privileged_denials') {
    if (!isPositiveSafeInteger(value.count)) return null;
    return {
      type: 'repeated_privileged_denials',
      actorKey: value.actorKey,
      windowStart,
      windowEnd,
      count: value.count,
    };
  }

  if (!isPositiveSafeInteger(value.uniqueTargetCount)) return null;
  return {
    type: 'rapid_multi_target_access',
    actorKey: value.actorKey,
    windowStart,
    windowEnd,
    uniqueTargetCount: value.uniqueTargetCount,
  };
}

function sourceOccurredAt(detection: SecurityDetection): string {
  return detection.type === 'machine_privileged_authority_attempt'
    ? detection.occurredAt
    : detection.windowEnd;
}

export function buildSecurityAlertCandidate(
  detectionInput: unknown,
  policyInput: unknown,
  detectedAtInput: unknown,
): SecurityAlertBuildResult {
  const policy = parsePolicy(policyInput);
  if (!policy) return { status: 'INVALID_POLICY', alert: null };

  const detection = parseDetection(detectionInput);
  if (!detection) return { status: 'INVALID_DETECTION', alert: null };

  const detectedAt = canonicalUtcTimestamp(detectedAtInput);
  if (!detectedAt) return { status: 'INVALID_TIMESTAMP', alert: null };

  const sourceAt = sourceOccurredAt(detection);
  if (Date.parse(detectedAt) < Date.parse(sourceAt)) {
    return { status: 'INVALID_TIMESTAMP', alert: null };
  }

  const route = policy[detection.type];
  const acknowledgeBy = addSeconds(detectedAt, route.acknowledgeWithinSeconds);
  const escalateAt = addSeconds(detectedAt, route.escalateAfterSeconds);
  if (!acknowledgeBy || !escalateAt) return { status: 'INVALID_TIMESTAMP', alert: null };

  return {
    status: 'BUILT',
    alert: {
      schemaVersion: SECURITY_ALERT_SCHEMA_VERSION,
      sourceDetectionType: detection.type,
      sourceActorKey: detection.actorKey,
      sourceOccurredAt: sourceAt,
      detectedAt,
      severity: route.severity,
      primaryOwner: route.primaryOwner,
      acknowledgeBy,
      escalationOwner: route.escalationOwner,
      escalateAt,
    },
  };
}

function parseAlert(value: unknown): SecurityAlertCandidate | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ALERT_KEYS)) return null;
  if (value.schemaVersion !== SECURITY_ALERT_SCHEMA_VERSION) return null;
  if (!includesString(DETECTION_TYPES, value.sourceDetectionType)) return null;
  if (typeof value.sourceActorKey !== 'string' || !validActorKeyForDetection(value.sourceDetectionType, value.sourceActorKey)) return null;
  if (!includesString(SECURITY_ALERT_SEVERITIES, value.severity)) return null;
  if (!includesString(SECURITY_ALERT_OWNER_ROLES, value.primaryOwner)) return null;
  if (!includesString(SECURITY_ALERT_OWNER_ROLES, value.escalationOwner)) return null;

  const sourceAt = canonicalUtcTimestamp(value.sourceOccurredAt);
  const detectedAt = canonicalUtcTimestamp(value.detectedAt);
  const acknowledgeBy = canonicalUtcTimestamp(value.acknowledgeBy);
  const escalateAt = canonicalUtcTimestamp(value.escalateAt);
  if (!sourceAt || !detectedAt || !acknowledgeBy || !escalateAt) return null;
  if (Date.parse(detectedAt) < Date.parse(sourceAt)) return null;
  if (Date.parse(acknowledgeBy) < Date.parse(detectedAt)) return null;
  if (Date.parse(escalateAt) < Date.parse(acknowledgeBy)) return null;

  return {
    schemaVersion: SECURITY_ALERT_SCHEMA_VERSION,
    sourceDetectionType: value.sourceDetectionType,
    sourceActorKey: value.sourceActorKey,
    sourceOccurredAt: sourceAt,
    detectedAt,
    severity: value.severity,
    primaryOwner: value.primaryOwner,
    acknowledgeBy,
    escalationOwner: value.escalationOwner,
    escalateAt,
  };
}

function parseAcknowledgement(
  value: unknown,
  alert: SecurityAlertCandidate,
  evaluationAt: string,
): SecurityAlertAcknowledgement | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ACK_KEYS)) return null;
  if (!includesString(SECURITY_ALERT_OWNER_ROLES, value.acknowledgedBy)) return null;
  if (value.acknowledgedBy !== alert.primaryOwner && value.acknowledgedBy !== alert.escalationOwner) return null;

  const acknowledgedAt = canonicalUtcTimestamp(value.acknowledgedAt);
  if (!acknowledgedAt) return null;
  if (Date.parse(acknowledgedAt) < Date.parse(alert.detectedAt)) return null;
  if (Date.parse(acknowledgedAt) > Date.parse(evaluationAt)) return null;

  return {
    acknowledgedAt,
    acknowledgedBy: value.acknowledgedBy,
  };
}

export function evaluateSecurityAlertResponse(
  alertInput: unknown,
  evaluationAtInput: unknown,
  acknowledgementInput: unknown = null,
): SecurityAlertResponseEvaluation {
  const alert = parseAlert(alertInput);
  if (!alert) {
    return {
      status: 'INVALID_ALERT',
      state: null,
      acknowledgementLatencySeconds: null,
      acknowledgementOnTime: null,
    };
  }

  const evaluationAt = canonicalUtcTimestamp(evaluationAtInput);
  if (!evaluationAt || Date.parse(evaluationAt) < Date.parse(alert.detectedAt)) {
    return {
      status: 'INVALID_TIMESTAMP',
      state: null,
      acknowledgementLatencySeconds: null,
      acknowledgementOnTime: null,
    };
  }

  if (acknowledgementInput !== null) {
    const acknowledgement = parseAcknowledgement(acknowledgementInput, alert, evaluationAt);
    if (!acknowledgement) {
      return {
        status: 'INVALID_ACKNOWLEDGEMENT',
        state: null,
        acknowledgementLatencySeconds: null,
        acknowledgementOnTime: null,
      };
    }

    const latencySeconds = (Date.parse(acknowledgement.acknowledgedAt) - Date.parse(alert.detectedAt)) / 1000;
    return {
      status: 'EVALUATED',
      state: 'ACKNOWLEDGED',
      acknowledgementLatencySeconds: latencySeconds,
      acknowledgementOnTime: Date.parse(acknowledgement.acknowledgedAt) <= Date.parse(alert.acknowledgeBy),
    };
  }

  const now = Date.parse(evaluationAt);
  if (now >= Date.parse(alert.escalateAt)) {
    return {
      status: 'EVALUATED',
      state: 'ESCALATION_DUE',
      acknowledgementLatencySeconds: null,
      acknowledgementOnTime: null,
    };
  }

  if (now >= Date.parse(alert.acknowledgeBy)) {
    return {
      status: 'EVALUATED',
      state: 'ACK_OVERDUE',
      acknowledgementLatencySeconds: null,
      acknowledgementOnTime: null,
    };
  }

  return {
    status: 'EVALUATED',
    state: 'OPEN',
    acknowledgementLatencySeconds: null,
    acknowledgementOnTime: null,
  };
}
