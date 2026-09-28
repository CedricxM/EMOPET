import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE,
  BleFeatureTransportError,
  FEATURE_SUMMARY_HEADER,
  SOURCE_TAG,
  classifyFeatureSequence,
  computeCrc,
  parseActivityVariabilityFeatureFrame,
  serializeActivityVariabilityFeatureFrame,
} from '../dist/index.js';

function observed(overrides = {}) {
  return {
    transportVersion: 1,
    source: 'TAG',
    featureKey: 'activity_variability',
    featureContractVersion: 'tag-activity-variability-cv30m-v1',
    sequence: 65535,
    bootSessionId: 0x10203040,
    windowEndMs: 3_600_000,
    windowSeconds: 1800,
    validSeconds: 1700,
    observationStatus: 'OBSERVED',
    nullReason: null,
    qualityState: 'VALID',
    value: 0.42,
    ...overrides,
  };
}

function expectCode(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof BleFeatureTransportError && error.code === code,
  );
}

function withCrc(bytes) {
  const copy = bytes.slice();
  copy[copy.length - 1] = computeCrc(copy, copy.length - 1);
  return copy;
}

test('activity feature frame round-trips the versioned 30-minute transport contract', () => {
  const bytes = serializeActivityVariabilityFeatureFrame(observed());

  assert.equal(bytes.length, ACTIVITY_VARIABILITY_FEATURE_FRAME_SIZE);
  assert.equal(bytes[0], FEATURE_SUMMARY_HEADER);
  assert.equal(bytes[2], SOURCE_TAG);

  const parsed = parseActivityVariabilityFeatureFrame(bytes);
  assert.equal(parsed.featureKey, 'activity_variability');
  assert.equal(parsed.featureContractVersion, 'tag-activity-variability-cv30m-v1');
  assert.equal(parsed.sequence, 65535);
  assert.equal(parsed.bootSessionId, 0x10203040);
  assert.equal(parsed.windowEndMs, 3_600_000);
  assert.equal(parsed.windowSeconds, 1800);
  assert.equal(parsed.validSeconds, 1700);
  assert.equal(parsed.observationStatus, 'OBSERVED');
  assert.equal(parsed.nullReason, null);
  assert.equal(parsed.qualityState, 'VALID');
  assert.ok(Math.abs(parsed.value - 0.42) < 1e-6);
});

test('explicit null observations preserve reason and cannot smuggle a numeric value', () => {
  const bytes = serializeActivityVariabilityFeatureFrame(observed({
    sequence: 7,
    validSeconds: 400,
    observationStatus: 'NOT_OBSERVED',
    nullReason: 'INSUFFICIENT_COVERAGE',
    qualityState: 'DEGRADED',
    value: null,
  }));

  const parsed = parseActivityVariabilityFeatureFrame(bytes);
  assert.equal(parsed.value, null);
  assert.equal(parsed.nullReason, 'INSUFFICIENT_COVERAGE');
  assert.equal(parsed.validSeconds, 400);

  const hidden = bytes.slice();
  new DataView(hidden.buffer).setFloat32(22, 0.9, true);
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(hidden)), 'INVALID_SEMANTICS');
});

test('codec fails closed on framing, contract and semantic drift', () => {
  const valid = serializeActivityVariabilityFeatureFrame(observed());

  expectCode(() => parseActivityVariabilityFeatureFrame(valid.slice(0, -1)), 'INVALID_LENGTH');

  const badHeader = valid.slice();
  badHeader[0] = 0;
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(badHeader)), 'INVALID_HEADER');

  const badVersion = valid.slice();
  badVersion[1] = 2;
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(badVersion)), 'INVALID_VERSION');

  const badSource = valid.slice();
  badSource[2] = 1;
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(badSource)), 'INVALID_SOURCE');

  const badFeature = valid.slice();
  badFeature[3] = 2;
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(badFeature)), 'INVALID_FEATURE');

  const badContract = valid.slice();
  badContract[4] = 2;
  expectCode(() => parseActivityVariabilityFeatureFrame(withCrc(badContract)), 'INVALID_CONTRACT_VERSION');

  const badCrc = valid.slice();
  badCrc[badCrc.length - 1] ^= 0x01;
  expectCode(() => parseActivityVariabilityFeatureFrame(badCrc), 'CRC_MISMATCH');

  expectCode(
    () => serializeActivityVariabilityFeatureFrame(observed({ validSeconds: 899 })),
    'INVALID_SEMANTICS',
  );
  expectCode(
    () => serializeActivityVariabilityFeatureFrame(observed({ qualityState: 'SUPPRESSED' })),
    'INVALID_SEMANTICS',
  );
  expectCode(
    () => serializeActivityVariabilityFeatureFrame(observed({
      observationStatus: 'NOT_OBSERVED',
      nullReason: 'MEAN_BELOW_DIVISION_GUARD',
      value: null,
      validSeconds: 899,
    })),
    'INVALID_SEMANTICS',
  );
});

test('per-boot uint16 sequence relation is wrap-aware without claiming device authentication', () => {
  const previous = { bootSessionId: 10, sequence: 65535 };

  assert.equal(
    classifyFeatureSequence(previous, { bootSessionId: 10, sequence: 0 }),
    'CONTIGUOUS',
  );
  assert.equal(
    classifyFeatureSequence(previous, { bootSessionId: 10, sequence: 65535 }),
    'DUPLICATE_SEQUENCE',
  );
  assert.equal(
    classifyFeatureSequence({ bootSessionId: 10, sequence: 10 }, { bootSessionId: 10, sequence: 15 }),
    'FORWARD_GAP',
  );
  assert.equal(
    classifyFeatureSequence({ bootSessionId: 10, sequence: 15 }, { bootSessionId: 10, sequence: 10 }),
    'OUT_OF_ORDER',
  );
  assert.equal(
    classifyFeatureSequence(previous, { bootSessionId: 11, sequence: 0 }),
    'NEW_BOOT_SESSION',
  );
});
