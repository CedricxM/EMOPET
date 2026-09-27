import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BleFeatureTransportError,
  parseActivityVariabilityFeatureFrame,
  serializeActivityVariabilityFeatureFrame,
} from '../../packages/ble-protocol/dist/index.js';
import {
  buildActivityVariabilityEnvelopeFromTransport,
} from '../../backend/dist/api/services/activity-variability-transport-adapter.js';

const DOG = 'b6111111-1111-4111-8111-111111111111';
const TAG = 'd6111111-1111-4111-8111-111111111111';

function frame(overrides = {}) {
  return {
    transportVersion: 1,
    source: 'TAG',
    featureKey: 'activity_variability',
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    sequence: 65535,
    bootSessionId: 0x66778899,
    windowEndMs: 3_600_000,
    windowSeconds: 1800,
    validSeconds: 1700,
    observationStatus: 'OBSERVED',
    nullReason: null,
    qualityState: 'DEGRADED',
    value: 0.44,
    ...overrides,
  };
}

test('feature transport conformance reaches the canonical persistence envelope without ELI semantics', () => {
  const wire = serializeActivityVariabilityFeatureFrame(frame());
  const parsed = parseActivityVariabilityFeatureFrame(wire);

  const built = buildActivityVariabilityEnvelopeFromTransport({
    dogId: DOG,
    deviceId: TAG,
    frame: parsed,
    clockAnchor: {
      deviceId: TAG,
      bootSessionId: 0x66778899,
      anchorDeviceMs: 3_700_000,
      anchorUtc: new Date('2026-09-27T12:01:40.000Z'),
      uncertaintyMs: 225,
    },
    maxLookbackMs: 600_000,
  });

  assert.equal(built.ok, true, JSON.stringify(built));
  assert.equal(built.envelope.observedAt.toISOString(), '2026-09-27T12:00:00.000Z');
  assert.equal(built.envelope.featureKey, 'activity_variability');
  assert.equal(built.envelope.featureContractVersion, 'tag-activity-variability-cv30m-v1');
  assert.equal(built.envelope.qualityState, 'DEGRADED');
  assert.equal(built.envelope.transportProvenance.bootSessionId, 0x66778899);
  assert.equal(built.envelope.transportProvenance.sequence, 65535);
  assert.equal(built.envelope.transportProvenance.windowEndMs, 3_600_000);
  assert.equal(built.envelope.eventTimeProvenance.strategy, 'BOOT_ANCHOR_V1');
  assert.equal(built.envelope.eventTimeProvenance.uncertaintyMs, 225);

  assert.equal('arousal' in built.envelope, false);
  assert.equal('valence' in built.envelope, false);
});

test('wire corruption is rejected before the backend adapter can see a frame', () => {
  const wire = serializeActivityVariabilityFeatureFrame(frame());
  const corrupt = wire.slice();
  corrupt[corrupt.length - 1] ^= 0x01;

  assert.throws(
    () => parseActivityVariabilityFeatureFrame(corrupt),
    (error) => error instanceof BleFeatureTransportError && error.code === 'CRC_MISMATCH',
  );
});

test('adapter rejects structurally fabricated transport drift even without wire parsing', () => {
  const built = buildActivityVariabilityEnvelopeFromTransport({
    dogId: DOG,
    deviceId: TAG,
    frame: frame({ qualityState: 'SUPPRESSED' }),
    clockAnchor: {
      deviceId: TAG,
      bootSessionId: 0x66778899,
      anchorDeviceMs: 3_700_000,
      anchorUtc: new Date('2026-09-27T12:01:40.000Z'),
      uncertaintyMs: 225,
    },
    maxLookbackMs: 600_000,
  });

  assert.equal(built.ok, false);
  assert.equal(built.error, 'INVALID_TRANSPORT_FRAME');
});
