import type { ClockAnchorResponseFrame } from '@emopet/ble-protocol';

export const BOOT_ANCHOR_V1_MAX_RTT_MS = 1500 as const;
export const BOOT_ANCHOR_V1_MAX_WALL_MONOTONIC_SKEW_MS = 100 as const;

export type BootAnchorCaptureErrorCode =
  | 'INVALID_CAPTURE_TIME'
  | 'INVALID_WALL_CLOCK_UNCERTAINTY'
  | 'CLOCK_SAMPLE_RTT_TOO_HIGH'
  | 'WALL_CLOCK_DISCONTINUITY'
  | 'CLOCK_ANCHOR_NONCE_MISMATCH'
  | 'CLOCK_SAMPLE_BOOT_MISMATCH';

export class BootAnchorCaptureError extends Error {
  constructor(
    public readonly code: BootAnchorCaptureErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BootAnchorCaptureError';
  }
}

export interface CapturedBootAnchorV1 {
  strategy: 'BOOT_ANCHOR_V1';
  canonicalDeviceId: string;
  bleDeviceId: string;
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: Date;
  uncertaintyMs: number;
  roundTripMs: number;
  wallMonotonicSkewMs: number;
  requestNonce: number;
}

/**
 * Convert one correlated BLE clock-anchor handshake into BOOT_ANCHOR_V1.
 *
 * Duration is measured by a monotonic clock. Wall time is used only to place
 * the bounded interval on UTC. The caller must provide an explicit uncertainty
 * budget for the local wall clock; transport RTT alone is not total UTC
 * uncertainty.
 */
export function buildBootAnchorV1(input: {
  canonicalDeviceId: string;
  bleDeviceId: string;
  wallBeforeUtcMs: number;
  wallAfterUtcMs: number;
  monotonicBeforeMs: number;
  monotonicAfterMs: number;
  localWallClockUncertaintyMs: number;
  requestNonce: number;
  response: ClockAnchorResponseFrame;
  expectedBootSessionId?: number;
  maxRttMs?: number;
  maxWallMonotonicSkewMs?: number;
}): CapturedBootAnchorV1 {
  const {
    canonicalDeviceId,
    bleDeviceId,
    wallBeforeUtcMs,
    wallAfterUtcMs,
    monotonicBeforeMs,
    monotonicAfterMs,
    localWallClockUncertaintyMs,
    requestNonce,
    response,
    expectedBootSessionId,
    maxRttMs = BOOT_ANCHOR_V1_MAX_RTT_MS,
    maxWallMonotonicSkewMs = BOOT_ANCHOR_V1_MAX_WALL_MONOTONIC_SKEW_MS,
  } = input;

  if (
    !Number.isSafeInteger(wallBeforeUtcMs)
    || !Number.isSafeInteger(wallAfterUtcMs)
    || wallAfterUtcMs < wallBeforeUtcMs
    || !Number.isFinite(monotonicBeforeMs)
    || !Number.isFinite(monotonicAfterMs)
    || monotonicBeforeMs < 0
    || monotonicAfterMs < monotonicBeforeMs
  ) {
    throw new BootAnchorCaptureError(
      'INVALID_CAPTURE_TIME',
      'Clock-anchor capture timestamps are invalid.',
    );
  }

  if (
    !Number.isSafeInteger(localWallClockUncertaintyMs)
    || localWallClockUncertaintyMs < 0
  ) {
    throw new BootAnchorCaptureError(
      'INVALID_WALL_CLOCK_UNCERTAINTY',
      'Local wall-clock uncertainty must be an explicit non-negative integer.',
    );
  }

  if (response.requestNonce !== requestNonce) {
    throw new BootAnchorCaptureError(
      'CLOCK_ANCHOR_NONCE_MISMATCH',
      'Clock-anchor response does not match the outstanding request nonce.',
    );
  }

  if (
    expectedBootSessionId !== undefined
    && response.bootSessionId !== expectedBootSessionId
  ) {
    throw new BootAnchorCaptureError(
      'CLOCK_SAMPLE_BOOT_MISMATCH',
      'Clock-anchor response and feature frame belong to different boot sessions.',
    );
  }

  const roundTripMs = monotonicAfterMs - monotonicBeforeMs;
  if (roundTripMs > maxRttMs) {
    throw new BootAnchorCaptureError(
      'CLOCK_SAMPLE_RTT_TOO_HIGH',
      `Clock-anchor RTT ${roundTripMs.toFixed(3)}ms exceeds ${maxRttMs}ms.`,
    );
  }

  const wallElapsedMs = wallAfterUtcMs - wallBeforeUtcMs;
  const wallMonotonicSkewMs = Math.abs(wallElapsedMs - roundTripMs);
  if (wallMonotonicSkewMs > maxWallMonotonicSkewMs) {
    throw new BootAnchorCaptureError(
      'WALL_CLOCK_DISCONTINUITY',
      `Wall/monotonic elapsed time diverged by ${wallMonotonicSkewMs.toFixed(3)}ms.`,
    );
  }

  const midpointUtcMs = wallBeforeUtcMs + Math.floor(roundTripMs / 2);

  // RTT/2 bounds transport asymmetry. Local wall-clock uncertainty is supplied
  // by the caller and must not be assumed zero. Add observed wall/monotonic
  // divergence plus 2ms for Date.now quantization and midpoint rounding.
  const uncertaintyMs =
    localWallClockUncertaintyMs
    + Math.ceil(roundTripMs / 2)
    + Math.ceil(wallMonotonicSkewMs)
    + 2;

  return {
    strategy: 'BOOT_ANCHOR_V1',
    canonicalDeviceId,
    bleDeviceId,
    bootSessionId: response.bootSessionId,
    anchorDeviceMs: response.deviceMs,
    anchorUtc: new Date(midpointUtcMs),
    uncertaintyMs,
    roundTripMs,
    wallMonotonicSkewMs,
    requestNonce,
  };
}
