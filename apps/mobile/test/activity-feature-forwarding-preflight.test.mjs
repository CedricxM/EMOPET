import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/services/activity-feature-forwarding-preflight.ts', import.meta.url),
  'utf8',
);

test('mobile preflight composes existing authorities without performing network IO', () => {
  assert.match(source, /buildActivityFeatureForwardingCandidate/);
  assert.match(source, /CanonicalTagResolution/);
  assert.match(source, /CapturedBootAnchorV1/);

  assert.doesNotMatch(source, /submitActivityFeatureCandidate/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /activity-feature-network/);
});

test('canonical TAG resolution failures block before candidate construction', () => {
  assert.match(source, /CANONICAL_TAG_NOT_FOUND/);
  assert.match(source, /CANONICAL_TAG_AMBIGUOUS/);
  assert.match(source, /CANONICAL_TAG_DOG_MISMATCH/);
  assert.match(source, /tagResolution\.device\.dogId !== input\.dogId/);
});

test('freshness and uncertainty policy remain explicit caller inputs', () => {
  assert.match(source, /maxAnchorAgeMs: number/);
  assert.match(source, /maxAnchorUncertaintyMs: number/);
  assert.match(source, /maxAnchorAgeMs: input\.maxAnchorAgeMs/);
  assert.match(source, /maxAnchorUncertaintyMs: input\.maxAnchorUncertaintyMs/);
  assert.doesNotMatch(source, /maxAnchorAgeMs\s*=\s*\d/);
  assert.doesNotMatch(source, /maxAnchorUncertaintyMs\s*=\s*\d/);
});

test('a valid candidate remains explicitly blocked on physical-device authentication', () => {
  assert.match(source, /CANDIDATE_READY_TRUST_BLOCKED/);
  assert.match(source, /PHYSICAL_DEVICE_AUTHENTICATION_NOT_ESTABLISHED/);

  const falseClaims = source.match(/networkSubmissionAuthorized:\s*false/g) ?? [];
  assert.ok(falseClaims.length >= 4);
  assert.doesNotMatch(source, /networkSubmissionAuthorized:\s*true/);
  assert.doesNotMatch(source, /physicalDeviceAuthenticationEstablished:\s*true/);
});

test('the preflight preserves underlying forwarding-gate refusal detail', () => {
  assert.match(source, /FORWARDING_GATE_REJECTED/);
  assert.match(source, /forwardingGateError:\s*gated\.error/);
});
