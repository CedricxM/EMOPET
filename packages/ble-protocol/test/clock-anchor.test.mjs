import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BootAnchorTimingError,
  buildRequestClockAnchor,
  computeBootAnchorTiming,
  parseClockAnchorResponse,
  serializeClockAnchorResponse,
} from '../dist/index.js';

test('clock-anchor request carries command id + uint32 nonce little-endian', () => {
  assert.deepEqual(
    [...buildRequestClockAnchor(0x12345678)],
    [0x14, 0x78, 0x56, 0x34, 0x12],
  );
  assert.throws(() => buildRequestClockAnchor(-1), /NONCE_OUT_OF_RANGE/);
});

test('clock-anchor response round-trips request/session/device time', () => {
  const bytes = serializeClockAnchorResponse({
    requestNonce: 0x12345678,
    bootSessionId: 0x10203040,
    deviceMs: 0x55667788,
  });

  assert.equal(bytes.length, 16);
  assert.deepEqual(parseClockAnchorResponse(bytes), {
    transportVersion: 1,
    messageType: 'CLOCK_ANCHOR_RESPONSE',
    requestNonce: 0x12345678,
    bootSessionId: 0x10203040,
    deviceMs: 0x55667788,
  });

  const corrupted = bytes.slice();
  corrupted[7] ^= 0x01;
  assert.throws(
    () => parseClockAnchorResponse(corrupted),
    /CRC_MISMATCH/,
  );
});


test('BOOT_ANCHOR timing uses monotonic RTT plus explicit wall-clock uncertainty', () => {
  const timing = computeBootAnchorTiming({
    wallBeforeUtcMs: 1_000_000,
    wallAfterUtcMs: 1_000_120,
    monotonicBeforeMs: 50,
    monotonicAfterMs: 170,
    localWallClockUncertaintyMs: 25,
  });

  assert.deepEqual(timing, {
    anchorUtcMs: 1_000_060,
    uncertaintyMs: 87,
    roundTripMs: 120,
    wallMonotonicSkewMs: 0,
  });
});

test('BOOT_ANCHOR timing rejects wall-clock discontinuity', () => {
  assert.throws(
    () => computeBootAnchorTiming({
      wallBeforeUtcMs: 1_000_000,
      wallAfterUtcMs: 1_001_000,
      monotonicBeforeMs: 50,
      monotonicAfterMs: 150,
      localWallClockUncertaintyMs: 25,
    }),
    (error) =>
      error instanceof BootAnchorTimingError
      && error.code === 'WALL_CLOCK_DISCONTINUITY',
  );
});

test('BOOT_ANCHOR timing refuses implicit zero/invalid wall-clock authority', () => {
  assert.throws(
    () => computeBootAnchorTiming({
      wallBeforeUtcMs: 1_000_000,
      wallAfterUtcMs: 1_000_100,
      monotonicBeforeMs: 50,
      monotonicAfterMs: 150,
      localWallClockUncertaintyMs: -1,
    }),
    (error) =>
      error instanceof BootAnchorTimingError
      && error.code === 'INVALID_WALL_CLOCK_UNCERTAINTY',
  );
});
