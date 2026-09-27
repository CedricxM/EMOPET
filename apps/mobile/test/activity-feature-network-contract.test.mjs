import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/services/activity-feature-network.ts', import.meta.url),
  'utf8',
);

test('mobile feature POST client accepts only a prevalidated forwarding candidate', () => {
  assert.match(source, /ActivityFeatureForwardingCandidateV1Schema\.safeParse/);
  assert.match(source, /INVALID_FORWARDING_CANDIDATE/);
  assert.doesNotMatch(source, /maxAnchorAgeMs|maxAnchorUncertaintyMs/);
  assert.doesNotMatch(source, /buildActivityFeatureForwardingCandidate/);
});

test('current client has no success or persistence authority', () => {
  assert.match(source, /accepted: false/);
  assert.match(source, /persisted: false/);
  assert.match(source, /UNEXPECTED_SUCCESS_RESPONSE/);
  assert.doesNotMatch(source, /accepted: true/);
  assert.doesNotMatch(source, /persisted: true/);
});

test('Device Trust and network activation hard stops remain first-class outcomes', () => {
  assert.match(source, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.match(source, /FEATURE_NETWORK_INGESTION_NOT_ACTIVATED/);
  assert.match(source, /FEATURE_DEVICE_BINDING_INVALID/);
});

test('client does not invent automatic retry or offline queue behavior', () => {
  assert.doesNotMatch(source, /setTimeout|AsyncStorage|queue|backoff|retryAfter/i);
});
