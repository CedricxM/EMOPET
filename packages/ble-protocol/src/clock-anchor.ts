export const CLOCK_ANCHOR_RESPONSE_HEADER = 0xec as const;
export const CLOCK_ANCHOR_RESPONSE_VERSION = 1 as const;
export const CLOCK_ANCHOR_RESPONSE_TYPE = 1 as const;
export const CLOCK_ANCHOR_RESPONSE_LENGTH = 16 as const;

export interface ClockAnchorResponseFrame {
  transportVersion: 1;
  messageType: 'CLOCK_ANCHOR_RESPONSE';
  requestNonce: number;
  bootSessionId: number;
  deviceMs: number;
}

function xorCrc(bytes: Uint8Array, endExclusive: number): number {
  let crc = 0;
  for (let i = 0; i < endExclusive; i++) crc ^= bytes[i] ?? 0;
  return crc & 0xff;
}

export function parseClockAnchorResponse(bytes: Uint8Array): ClockAnchorResponseFrame {
  if (bytes.length !== CLOCK_ANCHOR_RESPONSE_LENGTH) {
    throw new Error(`CLOCK_ANCHOR_RESPONSE_LENGTH_MISMATCH:${bytes.length}`);
  }
  if (bytes[0] !== CLOCK_ANCHOR_RESPONSE_HEADER) {
    throw new Error('CLOCK_ANCHOR_RESPONSE_HEADER_MISMATCH');
  }
  if (bytes[1] !== CLOCK_ANCHOR_RESPONSE_VERSION) {
    throw new Error('CLOCK_ANCHOR_RESPONSE_VERSION_MISMATCH');
  }
  if (bytes[2] !== CLOCK_ANCHOR_RESPONSE_TYPE) {
    throw new Error('CLOCK_ANCHOR_RESPONSE_TYPE_MISMATCH');
  }

  const expectedCrc = xorCrc(bytes, CLOCK_ANCHOR_RESPONSE_LENGTH - 1);
  if (bytes[CLOCK_ANCHOR_RESPONSE_LENGTH - 1] !== expectedCrc) {
    throw new Error('CLOCK_ANCHOR_RESPONSE_CRC_MISMATCH');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    transportVersion: 1,
    messageType: 'CLOCK_ANCHOR_RESPONSE',
    requestNonce: view.getUint32(3, true),
    bootSessionId: view.getUint32(7, true),
    deviceMs: view.getUint32(11, true),
  };
}

export function serializeClockAnchorResponse(input: {
  requestNonce: number;
  bootSessionId: number;
  deviceMs: number;
}): Uint8Array {
  for (const [name, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new Error(`${name.toUpperCase()}_OUT_OF_RANGE`);
    }
  }

  const bytes = new Uint8Array(CLOCK_ANCHOR_RESPONSE_LENGTH);
  const view = new DataView(bytes.buffer);
  bytes[0] = CLOCK_ANCHOR_RESPONSE_HEADER;
  bytes[1] = CLOCK_ANCHOR_RESPONSE_VERSION;
  bytes[2] = CLOCK_ANCHOR_RESPONSE_TYPE;
  view.setUint32(3, input.requestNonce, true);
  view.setUint32(7, input.bootSessionId, true);
  view.setUint32(11, input.deviceMs, true);
  bytes[CLOCK_ANCHOR_RESPONSE_LENGTH - 1] = xorCrc(
    bytes,
    CLOCK_ANCHOR_RESPONSE_LENGTH - 1,
  );
  return bytes;
}


export interface BootClockAnchorRoundTripMeasurement {
  strategy: 'BOOT_ANCHOR_V1';
  requestNonce: number;
  bootSessionId: number;
  anchorDeviceMs: number;
  anchorUtc: Date;
  uncertaintyMs: number;
  rttMs: number;
}

/**
 * Derive one bounded UTC clock anchor from a nonce-matched request/response.
 *
 * The device timestamp is captured after the request reaches the peripheral and
 * before the response reaches the central, so its UTC correspondence lies
 * inside the observed round-trip interval.
 *
 * No canonical device identity is attached here. BLE transport identity and
 * registry/device trust remain separate authorities.
 */
export function deriveBootClockAnchorFromRoundTrip(input: {
  sendWallUtcMs: number;
  sendMonotonicMs: number;
  receiveMonotonicMs: number;
  response: ClockAnchorResponseFrame;
  timerQuantizationMs?: number;
}): BootClockAnchorRoundTripMeasurement {
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
  const anchorUtc = new Date(sendWallUtcMs + (rttMs / 2));
  if (!Number.isFinite(anchorUtc.getTime())) {
    throw new Error('CLOCK_ANCHOR_UTC_INVALID');
  }

  return {
    strategy: 'BOOT_ANCHOR_V1',
    requestNonce: response.requestNonce,
    bootSessionId: response.bootSessionId,
    anchorDeviceMs: response.deviceMs,
    anchorUtc,
    uncertaintyMs: Math.ceil(rttMs / 2) + timerQuantizationMs,
    rttMs,
  };
}
