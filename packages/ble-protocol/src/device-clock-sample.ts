import { computeCrc } from './parser/index.js';
import type { BleWireFrame } from './frames/index.js';

export const DEVICE_CLOCK_SAMPLE_HEADER = 0xec as const;
export const DEVICE_CLOCK_SAMPLE_VERSION = 0x01 as const;
export const DEVICE_CLOCK_SAMPLE_FRAME_SIZE = 11 as const;

export interface DeviceClockSampleFrame {
  transportVersion: 1;
  bootSessionId: number;
  deviceMs: number;
}

const HEADER_OFFSET = 0;
const VERSION_OFFSET = 1;
const BOOT_SESSION_OFFSET = 2;
const DEVICE_MS_OFFSET = 6;
const CRC_OFFSET = 10;

export class BleClockSampleError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_LENGTH'
      | 'INVALID_HEADER'
      | 'INVALID_VERSION'
      | 'INVALID_RANGE'
      | 'CRC_MISMATCH',
  ) {
    super(message);
    this.name = 'BleClockSampleError';
  }
}

function assertUint32(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new BleClockSampleError(
      `${field} must be a uint32`,
      'INVALID_RANGE',
    );
  }
}

export function serializeDeviceClockSampleFrame(
  frame: DeviceClockSampleFrame,
): BleWireFrame {
  if (frame.transportVersion !== DEVICE_CLOCK_SAMPLE_VERSION) {
    throw new BleClockSampleError(
      'Unsupported device clock sample version',
      'INVALID_VERSION',
    );
  }
  assertUint32(frame.bootSessionId, 'bootSessionId');
  assertUint32(frame.deviceMs, 'deviceMs');

  const bytes = new Uint8Array(DEVICE_CLOCK_SAMPLE_FRAME_SIZE);
  const view = new DataView(bytes.buffer);

  view.setUint8(HEADER_OFFSET, DEVICE_CLOCK_SAMPLE_HEADER);
  view.setUint8(VERSION_OFFSET, DEVICE_CLOCK_SAMPLE_VERSION);
  view.setUint32(BOOT_SESSION_OFFSET, frame.bootSessionId, true);
  view.setUint32(DEVICE_MS_OFFSET, frame.deviceMs, true);
  view.setUint8(CRC_OFFSET, computeCrc(bytes, CRC_OFFSET));

  return bytes;
}

export function parseDeviceClockSampleFrame(
  raw: BleWireFrame,
): DeviceClockSampleFrame {
  if (raw.length !== DEVICE_CLOCK_SAMPLE_FRAME_SIZE) {
    throw new BleClockSampleError(
      `Expected ${DEVICE_CLOCK_SAMPLE_FRAME_SIZE} clock-sample bytes, got ${raw.length}`,
      'INVALID_LENGTH',
    );
  }

  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

  if (view.getUint8(HEADER_OFFSET) !== DEVICE_CLOCK_SAMPLE_HEADER) {
    throw new BleClockSampleError('Invalid clock-sample header', 'INVALID_HEADER');
  }
  if (view.getUint8(VERSION_OFFSET) !== DEVICE_CLOCK_SAMPLE_VERSION) {
    throw new BleClockSampleError('Unsupported clock-sample version', 'INVALID_VERSION');
  }

  const expectedCrc = computeCrc(raw, CRC_OFFSET);
  const actualCrc = view.getUint8(CRC_OFFSET);
  if (expectedCrc !== actualCrc) {
    throw new BleClockSampleError(
      `Clock-sample CRC mismatch: expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)}`,
      'CRC_MISMATCH',
    );
  }

  return {
    transportVersion: DEVICE_CLOCK_SAMPLE_VERSION,
    bootSessionId: view.getUint32(BOOT_SESSION_OFFSET, true),
    deviceMs: view.getUint32(DEVICE_MS_OFFSET, true),
  };
}
