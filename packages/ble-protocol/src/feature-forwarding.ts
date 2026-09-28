import type {
  ActivityFeatureForwardingCandidateV1,
  ActivityVariabilityFeatureTransportFrame,
} from '@emopet/shared';
import { ActivityFeatureForwardingCandidateV1Schema } from '@emopet/shared/validators';

export interface ForwardingBootAnchorV1 {
  strategy: 'BOOT_ANCHOR_V1';
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: Date;
  uncertaintyMs: number;
  capturedMonotonicMs: number;
}

export type FeatureForwardingGateErrorCode =
  | 'INVALID_POLICY'
  | 'INVALID_MONOTONIC_TIME'
  | 'BOOT_SESSION_MISMATCH'
  | 'ANCHOR_TOO_OLD'
  | 'ANCHOR_UNCERTAINTY_TOO_HIGH'
  | 'INVALID_FORWARDING_CANDIDATE';

export type ActivityFeatureForwardingGateResult =
  | {
      ok: true;
      candidate: ActivityFeatureForwardingCandidateV1;
      anchorAgeMs: number;
    }
  | {
      ok: false;
      error: FeatureForwardingGateErrorCode;
      reason: string;
    };

/**
 * Build a network-forwarding candidate without performing network IO.
 *
 * Critical identity boundary:
 * - `canonicalDeviceId` must come from a backend-registry binding authority;
 * - a BLE runtime/device identifier is not accepted as identity by this API;
 * - Device Trust #66 remains separate even when the UUID is canonically bound.
 *
 * Policy ceilings intentionally have no defaults. Until a caller supplies an
 * authorised freshness and uncertainty budget, forwarding cannot proceed.
 */
export function buildActivityFeatureForwardingCandidate(input: {
  dogId: string;
  canonicalDeviceId: string;
  frame: ActivityVariabilityFeatureTransportFrame;
  anchor: ForwardingBootAnchorV1;
  currentMonotonicMs: number;
  maxAnchorAgeMs: number;
  maxAnchorUncertaintyMs: number;
}): ActivityFeatureForwardingGateResult {
  const {
    dogId,
    canonicalDeviceId,
    frame,
    anchor,
    currentMonotonicMs,
    maxAnchorAgeMs,
    maxAnchorUncertaintyMs,
  } = input;

  if (
    !Number.isSafeInteger(maxAnchorAgeMs)
    || maxAnchorAgeMs < 0
    || !Number.isSafeInteger(maxAnchorUncertaintyMs)
    || maxAnchorUncertaintyMs < 0
  ) {
    return {
      ok: false,
      error: 'INVALID_POLICY',
      reason: 'Forwarding requires explicit non-negative integer age and uncertainty ceilings.',
    };
  }

  if (
    !Number.isFinite(currentMonotonicMs)
    || currentMonotonicMs < 0
    || !Number.isFinite(anchor.capturedMonotonicMs)
    || anchor.capturedMonotonicMs < 0
    || currentMonotonicMs < anchor.capturedMonotonicMs
  ) {
    return {
      ok: false,
      error: 'INVALID_MONOTONIC_TIME',
      reason: 'Anchor freshness must be measured on one monotonic timeline.',
    };
  }

  if (frame.bootSessionId !== anchor.bootSessionId) {
    return {
      ok: false,
      error: 'BOOT_SESSION_MISMATCH',
      reason: 'Feature frame and clock anchor belong to different boot sessions.',
    };
  }

  if (
    !(anchor.anchorUtc instanceof Date)
    || !Number.isFinite(anchor.anchorUtc.getTime())
  ) {
    return {
      ok: false,
      error: 'INVALID_FORWARDING_CANDIDATE',
      reason: 'Clock anchor UTC must be a valid Date.',
    };
  }

  const anchorAgeMs = currentMonotonicMs - anchor.capturedMonotonicMs;
  if (anchorAgeMs > maxAnchorAgeMs) {
    return {
      ok: false,
      error: 'ANCHOR_TOO_OLD',
      reason: `Clock anchor age ${anchorAgeMs.toFixed(3)}ms exceeds the authorised ceiling.`,
    };
  }

  if (anchor.uncertaintyMs > maxAnchorUncertaintyMs) {
    return {
      ok: false,
      error: 'ANCHOR_UNCERTAINTY_TOO_HIGH',
      reason: `Clock anchor uncertainty ${anchor.uncertaintyMs}ms exceeds the authorised ceiling.`,
    };
  }

  const candidate: ActivityFeatureForwardingCandidateV1 = {
    schemaVersion: 'activity-feature-forwarding-v1',
    dogId,
    deviceId: canonicalDeviceId,
    frame,
    clockAnchor: {
      strategy: 'BOOT_ANCHOR_V1',
      bootSessionId: anchor.bootSessionId,
      anchorDeviceMs: anchor.anchorDeviceMs,
      anchorUtc: anchor.anchorUtc.toISOString(),
      uncertaintyMs: anchor.uncertaintyMs,
    },
  };

  const parsed = ActivityFeatureForwardingCandidateV1Schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_FORWARDING_CANDIDATE',
      reason: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  }

  return {
    ok: true,
    candidate: parsed.data,
    anchorAgeMs,
  };
}
