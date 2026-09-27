import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const service = await readFile(
  new URL('../src/services/device-registry.ts', import.meta.url),
  'utf8',
);
const shared = await readFile(
  new URL('../../../packages/shared/src/types/device-registry.ts', import.meta.url),
  'utf8',
);
const validators = await readFile(
  new URL('../../../packages/shared/src/validators/index.ts', import.meta.url),
  'utf8',
);

test('mobile canonical TAG resolver uses backend registry identity only', () => {
  assert.match(service, /\/api\/dogs\/\$\{encodeURIComponent\(dogId\)\}\/devices/);
  assert.match(service, /OwnerDogCanonicalDeviceRegistryResponseSchema\.parse/);
  assert.match(service, /status: 'AMBIGUOUS'/);
  assert.match(service, /physicalDeviceAuthenticationEstablished: false/);
  assert.doesNotMatch(service, /device\.id.*ble|ble.*device\.id/i);
});

test('shared registry contract explicitly rejects BLE identity and trust inflation', () => {
  assert.match(shared, /identityAuthority: 'BACKEND_REGISTRY_ONLY'/);
  assert.match(shared, /bleTransportIdentifierIsCanonicalIdentity: false/);
  assert.match(shared, /physicalDeviceAuthenticationEstablished: false/);
  assert.match(validators, /z\.literal\('BACKEND_REGISTRY_ONLY'\)/);
  assert.match(validators, /bleTransportIdentifierIsCanonicalIdentity: z\.literal\(false\)/);
});
