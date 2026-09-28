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


export const BOOT_ANCHOR_V1_MAX_RTT_MS = 1500 as const;
export const BOOT_ANCHOR_V1_MAX_WALL_MONOTONIC_SKEW_MS = 100 as const;

export type BootAnchorTimingErrorCode =
  | 'INVALID_CAPTURE_TIME'
  | 'INVALID_WALL_CLOCK_UNCERTAINTY'
  | 'CLOCK_SAMPLE_RTT_TOO_HIGH'
  | 'WALL_CLOCK_DISCONTINUITY';

export class BootAnchorTimingError extends Error {
  constructor(
    message: string,
    public readonly code: BootAnchorTimingErrorCode,
  ) {
    super(message);
    this.name = 'BootAnchorTimingError';
  }
}

export interface BootAnchorTiming {
  anchorUtcMs: number;
  uncertaintyMs: number;
  roundTripMs: number;
  wallMonotonicSkewMs: number;
}

/**
 * Bound one device timestamp to mobile UTC without using wall clock for RTT.
 *
 * The monotonic clock owns elapsed time. Date/wall time only places the interval
 * on UTC. A caller-supplied local wall-clock uncertainty budget is mandatory;
 * transport latency alone is never represented as total UTC uncertainty.
 */
export function computeBootAnchorTiming(input: {
  wallBeforeUtcMs: number;
  wallAfterUtcMs: number;
  monotonicBeforeMs: number;
  monotonicAfterMs: number;
  localWallClockUncertaintyMs: number;
  maxRttMs?: number;
  maxWallMonotonicSkewMs?: number;
}): BootAnchorTiming {
  const {
    wallBeforeUtcMs,
    wallAfterUtcMs,
    monotonicBeforeMs,
    monotonicAfterMs,
    localWallClockUncertaintyMs,
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
    throw new BootAnchorTimingError(
      'Clock-anchor capture timestamps are invalid.',
      'INVALID_CAPTURE_TIME',
    );
  }

  if (
    !Number.isSafeInteger(localWallClockUncertaintyMs)
    || localWallClockUncertaintyMs < 0
  ) {
    throw new BootAnchorTimingError(
      'Local wall-clock uncertainty must be an explicit non-negative integer.',
      'INVALID_WALL_CLOCK_UNCERTAINTY',
    );
  }

  const roundTripMs = monotonicAfterMs - monotonicBeforeMs;
  if (roundTripMs > maxRttMs) {
    throw new BootAnchorTimingError(
      `Clock-anchor RTT ${roundTripMs.toFixed(3)}ms exceeds ${maxRttMs}ms.`,
      'CLOCK_SAMPLE_RTT_TOO_HIGH',
    );
  }

  const wallElapsedMs = wallAfterUtcMs - wallBeforeUtcMs;
  const wallMonotonicSkewMs = Math.abs(wallElapsedMs - roundTripMs);
  if (wallMonotonicSkewMs > maxWallMonotonicSkewMs) {
    throw new BootAnchorTimingError(
      `Wall/monotonic elapsed time diverged by ${wallMonotonicSkewMs.toFixed(3)}ms.`,
      'WALL_CLOCK_DISCONTINUITY',
    );
  }

  return {
    anchorUtcMs: wallBeforeUtcMs + Math.floor(roundTripMs / 2),
    uncertaintyMs:
      localWallClockUncertaintyMs
      + Math.ceil(roundTripMs / 2)
      + Math.ceil(wallMonotonicSkewMs)
      + 2,
    roundTripMs,
    wallMonotonicSkewMs,
  };
}
