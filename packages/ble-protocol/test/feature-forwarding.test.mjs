import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildActivityFeatureForwardingCandidate,
} from '../dist/index.js';

const frame = {
  transportVersion: 1,
  source: 'TAG',
  featureKey: 'activity_variability',
  featureContractVersion: 'tag-activity-variability-cv30m-v1',
  sequence: 12,
  bootSessionId: 0x10203040,
  windowEndMs: 3_600_000,
  windowSeconds: 1800,
  validSeconds: 1700,
  observationStatus: 'OBSERVED',
  nullReason: null,
  qualityState: 'VALID',
  value: 0.42,
};

const anchor = {
  strategy: 'BOOT_ANCHOR_V1',
  bootSessionId: 0x10203040,
  anchorDeviceMs: 3_700_000,
  anchorUtc: new Date('2026-09-27T15:00:00.000Z'),
  uncertaintyMs: 80,
  capturedMonotonicMs: 10_000,
};

const base = {
  dogId: '11111111-1111-4111-8111-111111111111',
  canonicalDeviceId: '22222222-2222-4222-8222-222222222222',
  frame,
  anchor,
  currentMonotonicMs: 10_500,
  maxAnchorAgeMs: 1_000,
  maxAnchorUncertaintyMs: 100,
};

test('forwarding gate emits a candidate only with canonical identity + fresh bounded anchor', () => {
  const result = buildActivityFeatureForwardingCandidate(base);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.anchorAgeMs, 500);
  assert.equal(result.candidate.deviceId, base.canonicalDeviceId);
  assert.equal(result.candidate.clockAnchor.bootSessionId, frame.bootSessionId);
  assert.equal(result.candidate.clockAnchor.anchorUtc, '2026-09-27T15:00:00.000Z');
  assert.equal('bleDeviceId' in result.candidate, false);
});

test('forwarding gate rejects boot-session mismatch', () => {
  const result = buildActivityFeatureForwardingCandidate({
    ...base,
    anchor: { ...anchor, bootSessionId: 0x55667788 },
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'BOOT_SESSION_MISMATCH');
});

test('forwarding gate requires explicit freshness and uncertainty ceilings', () => {
  assert.equal(
    buildActivityFeatureForwardingCandidate({ ...base, maxAnchorAgeMs: -1 }).error,
    'INVALID_POLICY',
  );
  assert.equal(
    buildActivityFeatureForwardingCandidate({ ...base, maxAnchorUncertaintyMs: -1 }).error,
    'INVALID_POLICY',
  );
});

test('forwarding gate rejects stale or overly uncertain anchors', () => {
  const stale = buildActivityFeatureForwardingCandidate({
    ...base,
    currentMonotonicMs: 12_001,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error, 'ANCHOR_TOO_OLD');

  const uncertain = buildActivityFeatureForwardingCandidate({
    ...base,
    anchor: { ...anchor, uncertaintyMs: 101 },
  });
  assert.equal(uncertain.ok, false);
  assert.equal(uncertain.error, 'ANCHOR_UNCERTAINTY_TOO_HIGH');
});

test('forwarding gate rejects BLE-like transport ids masquerading as canonical UUIDs', () => {
  const result = buildActivityFeatureForwardingCandidate({
    ...base,
    canonicalDeviceId: 'AA:BB:CC:DD:EE:FF',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_FORWARDING_CANDIDATE');
});
