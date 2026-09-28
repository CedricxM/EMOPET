import type { ActivityFeatureForwardingCandidateV1 } from '@emopet/shared';
import { ActivityFeatureForwardingCandidateV1Schema } from '@emopet/shared/validators';

import { getApiBaseUrl } from './api';

export type ActivityFeatureNetworkSubmissionCode =
  | 'INVALID_FORWARDING_CANDIDATE'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'FEATURE_DEVICE_BINDING_INVALID'
  | 'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED'
  | 'FEATURE_NETWORK_INGESTION_NOT_ACTIVATED'
  | 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE'
  | 'UNEXPECTED_HTTP_RESPONSE'
  | 'UNEXPECTED_SUCCESS_RESPONSE'
  | 'NETWORK_ERROR';

export interface ActivityFeatureNetworkSubmissionResult {
  accepted: false;
  persisted: false;
  code: ActivityFeatureNetworkSubmissionCode;
  retryable: boolean;
  httpStatus: number | null;
}

/**
 * Bounded network client for #122.
 *
 * Input MUST already have passed the explicit #641 forwarding gate. This
 * function performs no policy selection, no BLE→registry identity inference,
 * no retry queue and no persistence claim.
 *
 * Until a versioned successful-ingestion response contract is separately
 * authorised, any 2xx response is fail-closed as UNEXPECTED_SUCCESS_RESPONSE.
 */
export async function submitActivityFeatureCandidate(
  candidate: ActivityFeatureForwardingCandidateV1,
  token: string,
): Promise<ActivityFeatureNetworkSubmissionResult> {
  const parsed = ActivityFeatureForwardingCandidateV1Schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      accepted: false,
      persisted: false,
      code: 'INVALID_FORWARDING_CANDIDATE',
      retryable: false,
      httpStatus: null,
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/api/sensors/features/activity-variability`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed.data),
      },
    );
  } catch {
    return {
      accepted: false,
      persisted: false,
      code: 'NETWORK_ERROR',
      retryable: true,
      httpStatus: null,
    };
  }

  const payload = await response.json().catch(() => ({})) as {
    code?: unknown;
    error?: unknown;
    retryable?: unknown;
  };

  if (response.ok) {
    return {
      accepted: false,
      persisted: false,
      code: 'UNEXPECTED_SUCCESS_RESPONSE',
      retryable: false,
      httpStatus: response.status,
    };
  }

  const explicitCode = typeof payload.code === 'string' ? payload.code : null;

  if (response.status === 401) {
    return {
      accepted: false,
      persisted: false,
      code: 'UNAUTHORIZED',
      retryable: false,
      httpStatus: response.status,
    };
  }

  if (response.status === 404) {
    return {
      accepted: false,
      persisted: false,
      code: 'NOT_FOUND',
      retryable: false,
      httpStatus: response.status,
    };
  }

  switch (explicitCode) {
    case 'FEATURE_DEVICE_BINDING_INVALID':
      return {
        accepted: false,
        persisted: false,
        code: 'FEATURE_DEVICE_BINDING_INVALID',
        retryable: false,
        httpStatus: response.status,
      };

    case 'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED':
      return {
        accepted: false,
        persisted: false,
        code: 'DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED',
        retryable: false,
        httpStatus: response.status,
      };

    case 'FEATURE_NETWORK_INGESTION_NOT_ACTIVATED':
      return {
        accepted: false,
        persisted: false,
        code: 'FEATURE_NETWORK_INGESTION_NOT_ACTIVATED',
        retryable: false,
        httpStatus: response.status,
      };

    case 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE':
      return {
        accepted: false,
        persisted: false,
        code: 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE',
        retryable: payload.retryable === true,
        httpStatus: response.status,
      };

    default:
      return {
        accepted: false,
        persisted: false,
        code: 'UNEXPECTED_HTTP_RESPONSE',
        retryable: false,
        httpStatus: response.status,
      };
  }
}
