import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UINT32_HALF_RANGE,
  resolveBootRelativeEventTime,
} from '../dist/api/services/device-boot-event-time.js';

const DEVICE = 'd1111111-1111-4111-8111-111111111111';

function anchor(overrides = {}) {
  return {
    deviceId: DEVICE,
    bootSessionId: 7,
    anchorDeviceMs: 3_700_000,
    anchorUtc: new Date('2026-09-27T10:01:40.000Z'),
    uncertaintyMs: 250,
    ...overrides,
  };
}

test('boot-relative event time resolves exactly while preserving uncertainty', () => {
  const result = resolveBootRelativeEventTime({
    deviceId: DEVICE,
    bootSessionId: 7,
    windowEndMs: 3_600_000,
    anchor: anchor(),
    maxLookbackMs: 600_000,
  });

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.lookbackMs, 100_000);
  assert.equal(result.observedAt.toISOString(), '2026-09-27T10:00:00.000Z');
  assert.equal(result.eventTimeProvenance.strategy, 'BOOT_ANCHOR_V1');
  assert.equal(result.eventTimeProvenance.anchorDeviceMs, 3_700_000);
  assert.equal(result.eventTimeProvenance.anchorUtc.toISOString(), '2026-09-27T10:01:40.000Z');
  assert.equal(result.eventTimeProvenance.uncertaintyMs, 250);
});

test('uint32 wrap resolves a recent pre-anchor feature without reversing time', () => {
  const result = resolveBootRelativeEventTime({
    deviceId: DEVICE,
    bootSessionId: 7,
    windowEndMs: 0xfffffff0,
    anchor: anchor({
      anchorDeviceMs: 50_000,
      anchorUtc: new Date('2026-09-27T10:00:50.000Z'),
    }),
    maxLookbackMs: 60_000,
  });

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.lookbackMs, 50_016);
  assert.equal(result.observedAt.toISOString(), '2026-09-27T09:59:59.984Z');
});

test('device and boot-session mismatches fail closed', () => {
  assert.deepEqual(
    resolveBootRelativeEventTime({
      deviceId: 'd2222222-2222-4222-8222-222222222222',
      bootSessionId: 7,
      windowEndMs: 3_600_000,
      anchor: anchor(),
      maxLookbackMs: 600_000,
    }),
    { ok: false, error: 'DEVICE_MISMATCH' },
  );

  assert.deepEqual(
    resolveBootRelativeEventTime({
      deviceId: DEVICE,
      bootSessionId: 8,
      windowEndMs: 3_600_000,
      anchor: anchor(),
      maxLookbackMs: 600_000,
    }),
    { ok: false, error: 'BOOT_SESSION_MISMATCH' },
  );
});

test('future-looking or stale device times are rejected by the caller-owned lookback bound', () => {
  assert.deepEqual(
    resolveBootRelativeEventTime({
      deviceId: DEVICE,
      bootSessionId: 7,
      windowEndMs: 3_800_000,
      anchor: anchor(),
      maxLookbackMs: 600_000,
    }),
    { ok: false, error: 'AMBIGUOUS_OR_TOO_OLD' },
  );

  assert.deepEqual(
    resolveBootRelativeEventTime({
      deviceId: DEVICE,
      bootSessionId: 7,
      windowEndMs: 1_000_000,
      anchor: anchor(),
      maxLookbackMs: 60_000,
    }),
    { ok: false, error: 'AMBIGUOUS_OR_TOO_OLD' },
  );
});

test('lookback policy cannot cross the uint32 half-range ambiguity boundary', () => {
  assert.deepEqual(
    resolveBootRelativeEventTime({
      deviceId: DEVICE,
      bootSessionId: 7,
      windowEndMs: 3_600_000,
      anchor: anchor(),
      maxLookbackMs: UINT32_HALF_RANGE,
    }),
    { ok: false, error: 'INVALID_INPUT' },
  );
});
