import {
  parseSecurityAlertDeliveryEnvelope,
  type SecurityAlertDeliveryEnvelope,
} from './security-alert-delivery.js';

export const SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION =
  'security-alert-delivery-attempt-v1' as const;

export const SECURITY_ALERT_DELIVERY_FAILURE_CODES = [
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_REJECTED',
  'DELIVERY_TIMEOUT',
  'ADAPTER_FAILURE',
] as const;
export type SecurityAlertDeliveryFailureCode =
  (typeof SECURITY_ALERT_DELIVERY_FAILURE_CODES)[number];

export type SecurityAlertDeliveryAttempt =
  | {
      schemaVersion: typeof SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION;
      attemptId: string;
      envelope: SecurityAlertDeliveryEnvelope;
      attemptedAt: string;
      state: 'PENDING';
      resolvedAt: null;
      providerReceiptRef: null;
      failureCode: null;
    }
  | {
      schemaVersion: typeof SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION;
      attemptId: string;
      envelope: SecurityAlertDeliveryEnvelope;
      attemptedAt: string;
      state: 'DELIVERED';
      resolvedAt: string;
      providerReceiptRef: string;
      failureCode: null;
    }
  | {
      schemaVersion: typeof SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION;
      attemptId: string;
      envelope: SecurityAlertDeliveryEnvelope;
      attemptedAt: string;
      state: 'ATTEMPT_FAILED';
      resolvedAt: string;
      providerReceiptRef: null;
      failureCode: SecurityAlertDeliveryFailureCode;
    };

export type SecurityAlertDeliveryAttemptBuildResult =
  | { status: 'BUILT'; attempt: SecurityAlertDeliveryAttempt }
  | {
      status:
        | 'INVALID_ENVELOPE'
        | 'INVALID_ATTEMPT_ID'
        | 'INVALID_TIMESTAMP';
      attempt: null;
    };

export type SecurityAlertDeliveryAttemptResolutionResult =
  | { status: 'RESOLVED'; attempt: SecurityAlertDeliveryAttempt }
  | {
      status:
        | 'INVALID_ATTEMPT'
        | 'INVALID_RESULT'
        | 'INVALID_TIMESTAMP';
      attempt: null;
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECEIPT_REF_RE = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/;
const ATTEMPT_KEYS = Object.freeze([
  'schemaVersion',
  'attemptId',
  'envelope',
  'attemptedAt',
  'state',
  'resolvedAt',
  'providerReceiptRef',
  'failureCode',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
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

function includesFailureCode(value: unknown): value is SecurityAlertDeliveryFailureCode {
  return typeof value === 'string'
    && SECURITY_ALERT_DELIVERY_FAILURE_CODES.includes(
      value as SecurityAlertDeliveryFailureCode,
    );
}

function parsePendingAttempt(input: unknown): Extract<
  SecurityAlertDeliveryAttempt,
  { state: 'PENDING' }
> | null {
  if (!isRecord(input) || !hasOnlyKeys(input, ATTEMPT_KEYS)) return null;
  if (input.schemaVersion !== SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION) return null;
  if (typeof input.attemptId !== 'string' || !UUID_RE.test(input.attemptId)) return null;
  if (
    input.state !== 'PENDING'
    || input.resolvedAt !== null
    || input.providerReceiptRef !== null
    || input.failureCode !== null
  ) {
    return null;
  }

  const envelope = parseSecurityAlertDeliveryEnvelope(input.envelope);
  const attemptedAt = canonicalUtcTimestamp(input.attemptedAt);
  if (!envelope || !attemptedAt) return null;
  if (Date.parse(attemptedAt) < Date.parse(envelope.detectedAt)) return null;

  return {
    schemaVersion: SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
    attemptId: input.attemptId.toLowerCase(),
    envelope,
    attemptedAt,
    state: 'PENDING',
    resolvedAt: null,
    providerReceiptRef: null,
    failureCode: null,
  };
}

export function createSecurityAlertDeliveryAttempt(
  envelopeInput: unknown,
  attemptIdInput: unknown,
  attemptedAtInput: unknown,
): SecurityAlertDeliveryAttemptBuildResult {
  const envelope = parseSecurityAlertDeliveryEnvelope(envelopeInput);
  if (!envelope) return { status: 'INVALID_ENVELOPE', attempt: null };

  if (typeof attemptIdInput !== 'string' || !UUID_RE.test(attemptIdInput)) {
    return { status: 'INVALID_ATTEMPT_ID', attempt: null };
  }

  const attemptedAt = canonicalUtcTimestamp(attemptedAtInput);
  if (!attemptedAt || Date.parse(attemptedAt) < Date.parse(envelope.detectedAt)) {
    return { status: 'INVALID_TIMESTAMP', attempt: null };
  }

  return {
    status: 'BUILT',
    attempt: {
      schemaVersion: SECURITY_ALERT_DELIVERY_ATTEMPT_SCHEMA_VERSION,
      attemptId: attemptIdInput.toLowerCase(),
      envelope,
      attemptedAt,
      state: 'PENDING',
      resolvedAt: null,
      providerReceiptRef: null,
      failureCode: null,
    },
  };
}

export function resolveSecurityAlertDeliveryAttempt(
  attemptInput: unknown,
  resultInput: unknown,
): SecurityAlertDeliveryAttemptResolutionResult {
  const attempt = parsePendingAttempt(attemptInput);
  if (!attempt) return { status: 'INVALID_ATTEMPT', attempt: null };
  if (!isRecord(resultInput) || typeof resultInput.status !== 'string') {
    return { status: 'INVALID_RESULT', attempt: null };
  }

  if (resultInput.status === 'DELIVERED') {
    if (!hasOnlyKeys(resultInput, ['status', 'resolvedAt', 'providerReceiptRef'])) {
      return { status: 'INVALID_RESULT', attempt: null };
    }
    const resolvedAt = canonicalUtcTimestamp(resultInput.resolvedAt);
    if (!resolvedAt || Date.parse(resolvedAt) < Date.parse(attempt.attemptedAt)) {
      return { status: 'INVALID_TIMESTAMP', attempt: null };
    }
    if (
      typeof resultInput.providerReceiptRef !== 'string'
      || !RECEIPT_REF_RE.test(resultInput.providerReceiptRef)
    ) {
      return { status: 'INVALID_RESULT', attempt: null };
    }

    return {
      status: 'RESOLVED',
      attempt: {
        ...attempt,
        state: 'DELIVERED',
        resolvedAt,
        providerReceiptRef: resultInput.providerReceiptRef,
        failureCode: null,
      },
    };
  }

  if (resultInput.status === 'ATTEMPT_FAILED') {
    if (!hasOnlyKeys(resultInput, ['status', 'resolvedAt', 'failureCode'])) {
      return { status: 'INVALID_RESULT', attempt: null };
    }
    const resolvedAt = canonicalUtcTimestamp(resultInput.resolvedAt);
    if (!resolvedAt || Date.parse(resolvedAt) < Date.parse(attempt.attemptedAt)) {
      return { status: 'INVALID_TIMESTAMP', attempt: null };
    }
    if (!includesFailureCode(resultInput.failureCode)) {
      return { status: 'INVALID_RESULT', attempt: null };
    }

    return {
      status: 'RESOLVED',
      attempt: {
        ...attempt,
        state: 'ATTEMPT_FAILED',
        resolvedAt,
        providerReceiptRef: null,
        failureCode: resultInput.failureCode,
      },
    };
  }

  return { status: 'INVALID_RESULT', attempt: null };
}
