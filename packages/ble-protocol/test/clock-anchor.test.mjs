import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRequestClockAnchor,
  deriveBootClockAnchorFromRoundTrip,
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


test('round-trip anchor uses midpoint UTC and conservative half-RTT uncertainty', () => {
  const result = deriveBootClockAnchorFromRoundTrip({
    sendWallUtcMs: 1_700_000_000_000,
    sendMonotonicMs: 100,
    receiveMonotonicMs: 124,
    response: {
      transportVersion: 1,
      messageType: 'CLOCK_ANCHOR_RESPONSE',
      requestNonce: 7,
      bootSessionId: 0x10203040,
      deviceMs: 0x55667788,
    },
    timerQuantizationMs: 1,
  });

  assert.equal(result.strategy, 'BOOT_ANCHOR_V1');
  assert.equal(result.requestNonce, 7);
  assert.equal(result.bootSessionId, 0x10203040);
  assert.equal(result.anchorDeviceMs, 0x55667788);
  assert.equal(result.rttMs, 24);
  assert.equal(result.uncertaintyMs, 13);
  assert.equal(result.anchorUtc.toISOString(), new Date(1_700_000_000_012).toISOString());
  assert.equal('deviceId' in result, false);
});

test('round-trip anchor rejects backwards monotonic time', () => {
  assert.throws(
    () => deriveBootClockAnchorFromRoundTrip({
      sendWallUtcMs: 1_700_000_000_000,
      sendMonotonicMs: 200,
      receiveMonotonicMs: 199,
      response: {
        transportVersion: 1,
        messageType: 'CLOCK_ANCHOR_RESPONSE',
        requestNonce: 1,
        bootSessionId: 2,
        deviceMs: 3,
      },
    }),
    /TIMING_INPUT_INVALID/,
  );
});
