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
