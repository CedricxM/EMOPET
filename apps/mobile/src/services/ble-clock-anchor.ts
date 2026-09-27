import {
  BootAnchorTimingError,
  computeBootAnchorTiming,
  type BootAnchorTimingErrorCode,
  type ClockAnchorResponseFrame,
} from '@emopet/ble-protocol';

export type BootAnchorCaptureErrorCode =
  | BootAnchorTimingErrorCode
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
 * Bind one correlated BLE clock-anchor response to the canonical device.
 *
 * Timing math lives in @emopet/ble-protocol so it has executable unit tests.
 * This mobile wrapper owns request correlation + feature boot-session matching.
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
}): CapturedBootAnchorV1 {
  const {
    canonicalDeviceId,
    bleDeviceId,
    requestNonce,
    response,
    expectedBootSessionId,
  } = input;

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

  let timing;
  try {
    timing = computeBootAnchorTiming({
      wallBeforeUtcMs: input.wallBeforeUtcMs,
      wallAfterUtcMs: input.wallAfterUtcMs,
      monotonicBeforeMs: input.monotonicBeforeMs,
      monotonicAfterMs: input.monotonicAfterMs,
      localWallClockUncertaintyMs: input.localWallClockUncertaintyMs,
    });
  } catch (error) {
    if (error instanceof BootAnchorTimingError) {
      throw new BootAnchorCaptureError(error.code, error.message);
    }
    throw error;
  }

  return {
    strategy: 'BOOT_ANCHOR_V1',
    canonicalDeviceId,
    bleDeviceId,
    bootSessionId: response.bootSessionId,
    anchorDeviceMs: response.deviceMs,
    anchorUtc: new Date(timing.anchorUtcMs),
    uncertaintyMs: timing.uncertaintyMs,
    roundTripMs: timing.roundTripMs,
    wallMonotonicSkewMs: timing.wallMonotonicSkewMs,
    requestNonce,
  };
}
