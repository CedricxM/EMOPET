import {
  buildActivityFeatureForwardingCandidate,
  type FeatureForwardingGateErrorCode,
} from '@emopet/ble-protocol';
import type {
  ActivityFeatureForwardingCandidateV1,
  ActivityVariabilityFeatureTransportFrame,
} from '@emopet/shared';

import type { CapturedBootAnchorV1 } from './ble-clock-anchor';
import type { CanonicalTagResolution } from './device-registry';

export type ActivityFeatureForwardingPreflightCode =
  | 'CANONICAL_TAG_NOT_FOUND'
  | 'CANONICAL_TAG_AMBIGUOUS'
  | 'CANONICAL_TAG_DOG_MISMATCH'
  | 'FORWARDING_GATE_REJECTED'
  | 'PHYSICAL_DEVICE_AUTHENTICATION_NOT_ESTABLISHED';

export type ActivityFeatureForwardingPreflightResult =
  | {
      status: 'BLOCKED';
      code:
        | 'CANONICAL_TAG_NOT_FOUND'
        | 'CANONICAL_TAG_AMBIGUOUS'
        | 'CANONICAL_TAG_DOG_MISMATCH'
        | 'FORWARDING_GATE_REJECTED';
      candidate: null;
      forwardingGateError?: FeatureForwardingGateErrorCode;
      networkSubmissionAuthorized: false;
      physicalDeviceAuthenticationEstablished: false;
    }
  | {
      status: 'CANDIDATE_READY_TRUST_BLOCKED';
      code: 'PHYSICAL_DEVICE_AUTHENTICATION_NOT_ESTABLISHED';
      candidate: ActivityFeatureForwardingCandidateV1;
      anchorAgeMs: number;
      networkSubmissionAuthorized: false;
      physicalDeviceAuthenticationEstablished: false;
    };

/**
 * Compose the already-delivered #122 mobile prerequisites into one bounded
 * preflight result.
 *
 * This function performs NO network IO and deliberately does not import the
 * network submission client. A registry row is attribution authority only, not
 * proof that the connected BLE peer is physically that canonical TAG.
 *
 * Policy values remain caller-supplied because no production freshness or
 * uncertainty ceilings have been selected. A successfully constructed
 * candidate therefore remains trust-blocked until #66 establishes the physical
 * device authentication path.
 */
export function prepareActivityFeatureForwardingPreflight(input: {
  dogId: string;
  tagResolution: CanonicalTagResolution;
  frame: ActivityVariabilityFeatureTransportFrame;
  anchor: CapturedBootAnchorV1;
  currentMonotonicMs: number;
  maxAnchorAgeMs: number;
  maxAnchorUncertaintyMs: number;
}): ActivityFeatureForwardingPreflightResult {
  if (input.tagResolution.status === 'NONE_FOUND') {
    return {
      status: 'BLOCKED',
      code: 'CANONICAL_TAG_NOT_FOUND',
      candidate: null,
      networkSubmissionAuthorized: false,
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  if (input.tagResolution.status === 'AMBIGUOUS') {
    return {
      status: 'BLOCKED',
      code: 'CANONICAL_TAG_AMBIGUOUS',
      candidate: null,
      networkSubmissionAuthorized: false,
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  if (input.tagResolution.device.dogId !== input.dogId) {
    return {
      status: 'BLOCKED',
      code: 'CANONICAL_TAG_DOG_MISMATCH',
      candidate: null,
      networkSubmissionAuthorized: false,
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  const gated = buildActivityFeatureForwardingCandidate({
    dogId: input.dogId,
    canonicalDeviceId: input.tagResolution.device.id,
    frame: input.frame,
    anchor: input.anchor,
    currentMonotonicMs: input.currentMonotonicMs,
    maxAnchorAgeMs: input.maxAnchorAgeMs,
    maxAnchorUncertaintyMs: input.maxAnchorUncertaintyMs,
  });

  if (!gated.ok) {
    return {
      status: 'BLOCKED',
      code: 'FORWARDING_GATE_REJECTED',
      candidate: null,
      forwardingGateError: gated.error,
      networkSubmissionAuthorized: false,
      physicalDeviceAuthenticationEstablished: false,
    };
  }

  return {
    status: 'CANDIDATE_READY_TRUST_BLOCKED',
    code: 'PHYSICAL_DEVICE_AUTHENTICATION_NOT_ESTABLISHED',
    candidate: gated.candidate,
    anchorAgeMs: gated.anchorAgeMs,
    networkSubmissionAuthorized: false,
    physicalDeviceAuthenticationEstablished: false,
  };
}
