import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [route, mobile, shared, authority] = await Promise.all([
  readFile(new URL('../../backend/api/routes/dogs.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../apps/mobile/src/services/device-registry.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../packages/shared/src/types/device-registry.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8')
]);

const cfg = JSON.parse(authority);

test('Owner canonical device registry is read-only and excludes transport identity', () => {
  assert.match(route, /dogs\.get\('\/:id\/devices'/);
  assert.match(route, /isNull\(devices\.unboundAt\)/);
  assert.match(route, /physicalDeviceAuthentication: 'NOT_ESTABLISHED'/);
  assert.doesNotMatch(route, /macAddress:\s*devices\.macAddress/);
});

test('mobile resolver fails closed on ambiguous TAG registry rows', () => {
  assert.match(mobile, /status: 'AMBIGUOUS'/);
  assert.match(mobile, /candidateDeviceIds/);
  assert.match(mobile, /physicalDeviceAuthenticationEstablished: false/);
  assert.doesNotMatch(mobile, /BLE.*canonical.*identity/i);
});

test('shared contract makes registry identity weaker than physical Device Trust', () => {
  assert.match(shared, /identityAuthority: 'BACKEND_REGISTRY_ONLY'/);
  assert.match(shared, /bleTransportIdentifierIsCanonicalIdentity: false/);
  assert.match(shared, /physicalDeviceAuthenticationEstablished: false/);
});

test('ELI-IO authority keeps forwarding and end-to-end delivery closed', () => {
  assert.equal(cfg.currentTransport.mobileCanonicalDeviceRegistryReadImplemented, true);
  assert.equal(cfg.currentTransport.mobileCanonicalTagResolverImplemented, true);
  assert.equal(cfg.currentTransport.mobileCanonicalTagResolverFailsOnAmbiguity, true);
  assert.equal(cfg.currentTransport.mobileBleTransportIdUsedAsCanonicalDeviceId, false);
  assert.equal(cfg.currentTransport.mobileBleToCanonicalDevicePhysicalBindingEstablished, false);
  assert.equal(cfg.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(cfg.currentTransport.endToEndPath, false);
  assert.equal(cfg.currentDecision, 'DO_NOT_CLAIM_END_TO_END_DELIVERY');
});
