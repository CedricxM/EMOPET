import {
  SECURITY_ALERT_OWNER_ROLES,
  SECURITY_ALERT_SEVERITIES,
  evaluateSecurityAlertResponse,
  type SecurityAlertCandidate,
  type SecurityAlertOwnerRole,
  type SecurityAlertSeverity,
  type SecurityDetectionType,
} from './security-alert-response.js';

export const SECURITY_ALERT_DELIVERY_SCHEMA_VERSION =
  'security-alert-delivery-v1' as const;

export const SECURITY_ALERT_DELIVERY_DETECTION_TYPES = [
  'repeated_privileged_denials',
  'rapid_multi_target_access',
  'machine_privileged_authority_attempt',
] as const satisfies readonly SecurityDetectionType[];

export interface SecurityAlertDeliveryEnvelope {
  schemaVersion: typeof SECURITY_ALERT_DELIVERY_SCHEMA_VERSION;
  sourceDetectionHistoryId: string;
  sourceDetectionType: SecurityDetectionType;
  severity: SecurityAlertSeverity;
  primaryOwner: SecurityAlertOwnerRole;
  detectedAt: string;
  acknowledgeBy: string;
  escalationOwner: SecurityAlertOwnerRole;
  escalateAt: string;
}

export type SecurityAlertDeliveryBuildResult =
  | { status: 'BUILT'; envelope: SecurityAlertDeliveryEnvelope }
  | {
      status: 'INVALID_ALERT' | 'INVALID_DETECTION_HISTORY_ID';
      envelope: null;
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENVELOPE_KEYS = Object.freeze([
  'schemaVersion',
  'sourceDetectionHistoryId',
  'sourceDetectionType',
  'severity',
  'primaryOwner',
  'detectedAt',
  'acknowledgeBy',
  'escalationOwner',
  'escalateAt',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && values.includes(value);
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

export function parseSecurityAlertDeliveryEnvelope(
  input: unknown,
): SecurityAlertDeliveryEnvelope | null {
  if (!isRecord(input) || !hasOnlyKeys(input, ENVELOPE_KEYS)) return null;
  if (input.schemaVersion !== SECURITY_ALERT_DELIVERY_SCHEMA_VERSION) return null;
  if (
    typeof input.sourceDetectionHistoryId !== 'string'
    || !UUID_RE.test(input.sourceDetectionHistoryId)
  ) {
    return null;
  }
  if (
    !includesString(
      SECURITY_ALERT_DELIVERY_DETECTION_TYPES,
      input.sourceDetectionType,
    )
    || !includesString(SECURITY_ALERT_SEVERITIES, input.severity)
    || !includesString(SECURITY_ALERT_OWNER_ROLES, input.primaryOwner)
    || !includesString(SECURITY_ALERT_OWNER_ROLES, input.escalationOwner)
  ) {
    return null;
  }

  const detectedAt = canonicalUtcTimestamp(input.detectedAt);
  const acknowledgeBy = canonicalUtcTimestamp(input.acknowledgeBy);
  const escalateAt = canonicalUtcTimestamp(input.escalateAt);
  if (!detectedAt || !acknowledgeBy || !escalateAt) return null;
  if (Date.parse(acknowledgeBy) < Date.parse(detectedAt)) return null;
  if (Date.parse(escalateAt) < Date.parse(acknowledgeBy)) return null;

  return {
    schemaVersion: SECURITY_ALERT_DELIVERY_SCHEMA_VERSION,
    sourceDetectionHistoryId: input.sourceDetectionHistoryId.toLowerCase(),
    sourceDetectionType: input.sourceDetectionType,
    severity: input.severity,
    primaryOwner: input.primaryOwner,
    detectedAt,
    acknowledgeBy,
    escalationOwner: input.escalationOwner,
    escalateAt,
  };
}

/**
 * Project an internal security-alert candidate into the bounded payload that a
 * future delivery adapter may consume.
 *
 * The internal candidate may carry sourceActorKey for response semantics. This
 * projection deliberately strips that identity before any provider/destination
 * layer exists. The durable detection-history UUID is the only source
 * reference that crosses this boundary.
 */
export function buildSecurityAlertDeliveryEnvelope(
  alertInput: unknown,
  detectionHistoryIdInput: unknown,
): SecurityAlertDeliveryBuildResult {
  if (
    typeof detectionHistoryIdInput !== 'string'
    || !UUID_RE.test(detectionHistoryIdInput)
  ) {
    return { status: 'INVALID_DETECTION_HISTORY_ID', envelope: null };
  }

  if (!isRecord(alertInput) || typeof alertInput.detectedAt !== 'string') {
    return { status: 'INVALID_ALERT', envelope: null };
  }

  const validation = evaluateSecurityAlertResponse(
    alertInput,
    alertInput.detectedAt,
  );
  if (validation.status !== 'EVALUATED') {
    return { status: 'INVALID_ALERT', envelope: null };
  }

  const alert = alertInput as unknown as SecurityAlertCandidate;

  return {
    status: 'BUILT',
    envelope: {
      schemaVersion: SECURITY_ALERT_DELIVERY_SCHEMA_VERSION,
      sourceDetectionHistoryId: detectionHistoryIdInput.toLowerCase(),
      sourceDetectionType: alert.sourceDetectionType,
      severity: alert.severity,
      primaryOwner: alert.primaryOwner,
      detectedAt: alert.detectedAt,
      acknowledgeBy: alert.acknowledgeBy,
      escalationOwner: alert.escalationOwner,
      escalateAt: alert.escalateAt,
    },
  };
}
