import type { DeviceClockSampleFrame } from '@emopet/ble-protocol';

export const BOOT_ANCHOR_V1_MAX_RTT_MS = 1500 as const;

export type BootAnchorCaptureErrorCode =
  | 'INVALID_CAPTURE_TIME'
  | 'CLOCK_SAMPLE_RTT_TOO_HIGH'
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
}

/**
 * Convert one bounded BLE clock read into a BOOT_ANCHOR_V1 sample.
 *
 * UTC is owned by the mobile clock. The TAG contributes only boot-session id
 * and device monotonic milliseconds. The midpoint avoids treating the response
 * receive timestamp as exact device time, while uncertainty remains explicit.
 */
export function buildBootAnchorV1(input: {
  canonicalDeviceId: string;
  bleDeviceId: string;
  beforeUtcMs: number;
  afterUtcMs: number;
  sample: DeviceClockSampleFrame;
  expectedBootSessionId?: number;
  maxRttMs?: number;
}): CapturedBootAnchorV1 {
  const {
    canonicalDeviceId,
    bleDeviceId,
    beforeUtcMs,
    afterUtcMs,
    sample,
    expectedBootSessionId,
    maxRttMs = BOOT_ANCHOR_V1_MAX_RTT_MS,
  } = input;

  if (
    !Number.isSafeInteger(beforeUtcMs)
    || !Number.isSafeInteger(afterUtcMs)
    || afterUtcMs < beforeUtcMs
  ) {
    throw new BootAnchorCaptureError(
      'INVALID_CAPTURE_TIME',
      'Clock-anchor capture timestamps are invalid.',
    );
  }

  const roundTripMs = afterUtcMs - beforeUtcMs;
  if (roundTripMs > maxRttMs) {
    throw new BootAnchorCaptureError(
      'CLOCK_SAMPLE_RTT_TOO_HIGH',
      `Clock-sample RTT ${roundTripMs}ms exceeds ${maxRttMs}ms.`,
    );
  }

  if (
    expectedBootSessionId !== undefined
    && sample.bootSessionId !== expectedBootSessionId
  ) {
    throw new BootAnchorCaptureError(
      'CLOCK_SAMPLE_BOOT_MISMATCH',
      'Clock sample and feature frame belong to different boot sessions.',
    );
  }

  const midpointMs = beforeUtcMs + Math.floor(roundTripMs / 2);

  // RTT/2 bounds transport asymmetry. +2ms accounts for millisecond timestamp
  // quantization on the mobile side and integer midpoint rounding.
  const uncertaintyMs = Math.ceil(roundTripMs / 2) + 2;

  return {
    strategy: 'BOOT_ANCHOR_V1',
    canonicalDeviceId,
    bleDeviceId,
    bootSessionId: sample.bootSessionId,
    anchorDeviceMs: sample.deviceMs,
    anchorUtc: new Date(midpointMs),
    uncertaintyMs,
    roundTripMs,
  };
}
