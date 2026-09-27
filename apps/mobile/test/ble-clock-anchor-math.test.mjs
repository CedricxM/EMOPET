import test from 'node:test';
import assert from 'node:assert/strict';

const module = await import('../src/services/ble-clock-anchor.ts');

test('midpoint UTC + half-RTT uncertainty are deterministic and fail-honest', () => {
  const result = module.buildMobileBootClockAnchorMeasurement({
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
  assert.equal(
    result.anchorUtc,
    new Date(1_700_000_000_012).toISOString(),
  );
  assert.equal('deviceId' in result, false);
});

test('clock-anchor math rejects backwards monotonic time', () => {
  assert.throws(
    () => module.buildMobileBootClockAnchorMeasurement({
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
