import {
  evaluateSecurityAlertResponse,
  type SecurityAlertCandidate,
  type SecurityAlertOwnerRole,
  type SecurityAlertSeverity,
  type SecurityDetectionType,
} from './security-alert-response.js';

export const SECURITY_ALERT_DELIVERY_SCHEMA_VERSION =
  'security-alert-delivery-v1' as const;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
