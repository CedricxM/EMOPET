import type { ClockAnchorResponseFrame } from '@emopet/ble-protocol';

export interface MobileBootClockAnchorMeasurement {
  strategy: 'BOOT_ANCHOR_V1';
  requestNonce: number;
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: string;
  uncertaintyMs: number;
  rttMs: number;
}

/**
 * Convert one nonce-matched BLE clock response into a bounded UTC anchor.
 *
 * The device timestamp is captured after the request reaches the peripheral and
 * before the response reaches the mobile. Therefore its UTC correspondence lies
 * inside the mobile-observed request/response interval.
 *
 * This function deliberately returns no canonical deviceId. BLE transport
 * identity must not be promoted into registry/device trust.
 */
export function buildMobileBootClockAnchorMeasurement(input: {
  sendWallUtcMs: number;
  sendMonotonicMs: number;
  receiveMonotonicMs: number;
  response: ClockAnchorResponseFrame;
  timerQuantizationMs?: number;
}): MobileBootClockAnchorMeasurement {
  const {
    sendWallUtcMs,
    sendMonotonicMs,
    receiveMonotonicMs,
    response,
    timerQuantizationMs = 1,
  } = input;

  if (
    !Number.isFinite(sendWallUtcMs)
    || !Number.isFinite(sendMonotonicMs)
    || !Number.isFinite(receiveMonotonicMs)
    || receiveMonotonicMs < sendMonotonicMs
    || !Number.isSafeInteger(timerQuantizationMs)
    || timerQuantizationMs < 0
  ) {
    throw new Error('CLOCK_ANCHOR_TIMING_INPUT_INVALID');
  }

  const rttMs = receiveMonotonicMs - sendMonotonicMs;
  const anchorUtcMs = sendWallUtcMs + (rttMs / 2);
  const uncertaintyMs = Math.ceil(rttMs / 2) + timerQuantizationMs;

  const anchorUtc = new Date(anchorUtcMs);
  if (!Number.isFinite(anchorUtc.getTime())) {
    throw new Error('CLOCK_ANCHOR_UTC_INVALID');
  }

  return {
    strategy: 'BOOT_ANCHOR_V1',
    requestNonce: response.requestNonce,
    bootSessionId: response.bootSessionId,
    anchorDeviceMs: response.deviceMs,
    anchorUtc: anchorUtc.toISOString(),
    uncertaintyMs,
    rttMs,
  };
}
