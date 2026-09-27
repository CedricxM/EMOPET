import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BleClockSampleError,
  parseDeviceClockSampleFrame,
  serializeDeviceClockSampleFrame,
} from '../dist/index.js';

test('device clock-sample codec round-trips uint32 boot and monotonic time', () => {
  const encoded = serializeDeviceClockSampleFrame({
    transportVersion: 1,
    bootSessionId: 0x10203040,
    deviceMs: 0x89abcdef,
  });

  assert.equal(encoded.length, 11);
  assert.deepEqual(parseDeviceClockSampleFrame(encoded), {
    transportVersion: 1,
    bootSessionId: 0x10203040,
    deviceMs: 0x89abcdef,
  });
});

test('clock-sample parser rejects CRC corruption', () => {
  const encoded = serializeDeviceClockSampleFrame({
    transportVersion: 1,
    bootSessionId: 7,
    deviceMs: 123456,
  });
  encoded[6] ^= 0x01;

  assert.throws(
    () => parseDeviceClockSampleFrame(encoded),
    (error) => error instanceof BleClockSampleError && error.code === 'CRC_MISMATCH',
  );
});

test('clock-sample parser rejects wrong length', () => {
  assert.throws(
    () => parseDeviceClockSampleFrame(new Uint8Array(10)),
    (error) => error instanceof BleClockSampleError && error.code === 'INVALID_LENGTH',
  );
});
