import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const [
  registrySource,
  storageSource,
  slotsHeader,
  provisionerSource,
  provisionerHeader,
  typesSource,
  validatorsSource,
  mainSource,
  gattSource,
] = await Promise.all([
  read('config/security/psa-key-id-registry-v1.json'),
  read('config/security/device-private-key-storage-v1.json'),
  read('firmware/collar/ncs/src/device_identity_key_slots.h'),
  read('firmware/collar/ncs/src/device_identity_key_provisioner_psa.c'),
  read('firmware/collar/ncs/src/device_identity_key_provisioner_psa.h'),
  read('packages/shared/src/types/device-pop.ts'),
  read('packages/shared/src/validators/index.ts'),
  read('firmware/collar/ncs/src/main.c'),
  read('firmware/collar/ncs/src/emopet_gatt.c'),
]);

const registry = JSON.parse(registrySource);
const storage = JSON.parse(storageSource);

test('EMOPET identity key ids occupy a controlled PSA user-key block', () => {
  const block = registry.reservedBlocks[0];
  assert.equal(registry.psaUserRange.min, '0x00000001');
  assert.equal(registry.psaUserRange.max, '0x3fffffff');
  assert.equal(block.min, '0x00010000');
  assert.equal(block.max, '0x0001000f');
  assert.equal(block.slots.A.keyId, '0x00010000');
  assert.equal(block.slots.B.keyId, '0x00010001');

  const ids = [0x00010000, 0x00010001];
  for (const id of ids) {
    assert.ok(id >= 0x00000001 && id <= 0x3fffffff);
  }

  assert.match(slotsHeader, /EMOPET_DEVICE_TRUST_KEY_BLOCK_MIN.*0x00010000u/);
  assert.match(slotsHeader, /EMOPET_DEVICE_TRUST_KEY_BLOCK_MAX.*0x0001000fu/);
  assert.match(slotsHeader, /EMOPET_DEVICE_IDENTITY_KEY_SLOT_A.*0x00010000u/);
  assert.match(slotsHeader, /EMOPET_DEVICE_IDENTITY_KEY_SLOT_B.*0x00010001u/);
});

test('identity provisioner is no longer a generic persistent-key factory', () => {
  assert.match(provisionerSource, /device_identity_key_id_is_reserved_slot\(key_id\)/);
  assert.match(
    provisionerSource,
    /DEVICE_IDENTITY_KEY_PROVISION_KEY_ID_NOT_RESERVED/,
  );
  assert.match(
    provisionerHeader,
    /Refuses any key id outside the reserved EMOPET identity slots A\/B/,
  );

  for (const forbidden of [
    /credential_version\s*%\s*2/,
    /credentialVersion\s*%\s*2/,
    /key_id\s*=\s*credential_version/,
  ]) {
    assert.doesNotMatch(provisionerSource, forbidden);
    assert.doesNotMatch(slotsHeader, forbidden);
  }
});

test('dual-slot rotation state machine forbids destructive shortcuts', () => {
  assert.equal(registry.invariants.keyIdIsCredentialIdentity, false);
  assert.equal(registry.invariants.credentialVersionDerivesKeyId, false);
  assert.equal(registry.invariants.keyIdDerivesCredentialVersion, false);
  assert.equal(registry.invariants.maximumActiveIdentityCredentials, 1);
  assert.equal(registry.invariants.maximumPendingIdentityCredentials, 1);
  assert.equal(registry.invariants.provisioningMustTargetNonActiveSlot, true);
  assert.equal(registry.invariants.slotReuseRequiresRevocationAndEraseAuthority, true);
  assert.equal(registry.invariants.slotReuseMayNeverReuseCredentialVersion, true);

  assert.deepEqual(
    registry.rotationStates,
    ['EMPTY', 'PENDING_PROOF', 'ACTIVE', 'REVOKED_PENDING_ERASE'],
  );

  assert.ok(registry.forbiddenTransitions.includes('ACTIVE -> EMPTY DIRECT'));
  assert.ok(
    registry.forbiddenTransitions.includes(
      'CREDENTIAL_VERSION_PARITY -> SLOT_SELECTION',
    ),
  );

  assert.equal(
    registry.currentDecision,
    'DUAL_SLOT_A_B_RESERVED / DESTRUCTIVE_ROTATION_RUNTIME_NOT_IMPLEMENTED',
  );
});

test('shared enrollment receipt is public-only and slot/id consistent', () => {
  for (const token of [
    'device-identity-enrollment-receipt-v1',
    "DeviceIdentityKeySlotV1 = 'A' | 'B'",
    "algorithm: 'ECDSA_P256_SHA256'",
    "publicKeyFormat: 'SEC1_UNCOMPRESSED_P256_65'",
    "state: 'PENDING_PROOF'",
    'privateKeyExported: false',
    "devicePrincipalBinding: 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'",
  ]) {
    assert.ok(typesSource.includes(token), token);
  }

  assert.match(validatorsSource, /DeviceIdentityEnrollmentReceiptV1Schema/);
  assert.match(validatorsSource, /publicKey: Base64UrlNoPaddingSchema\.length\(87\)/);
  assert.match(
    validatorsSource,
    /const expectedKeyId = value\.keySlot === 'A' \? 0x00010000 : 0x00010001/,
  );
  assert.match(validatorsSource, /privateKeyExported: z\.literal\(false\)/);

  assert.doesNotMatch(typesSource, /\bprivateKey\s*:/);
  assert.doesNotMatch(typesSource, /\bprivate_key\s*:/);
  assert.doesNotMatch(validatorsSource, /\bprivateKey\s*:\s*z\./);
  assert.doesNotMatch(validatorsSource, /\bprivate_key\s*:\s*z\./);
});

test('storage authority now owns the selected namespace without activating lifecycle runtime', () => {
  assert.equal(
    storage.selectedStorage.keyIdRegistry,
    'config/security/psa-key-id-registry-v1.json',
  );
  assert.deepEqual(storage.selectedStorage.identitySlots, {
    A: '0x00010000',
    B: '0x00010001',
  });
  assert.equal(storage.evidence.applicationKeyIdNamespaceSelected, true);
  assert.match(storage.lifecycle.rotation, /DUAL_SLOT_A_B_SELECTED/);
  assert.match(storage.lifecycle.rotation, /DESTRUCTIVE_RUNTIME_OPEN/);
});

test('slot selection contract does not activate provisioning, erase or Device Data Trust', () => {
  const activeRuntime = [mainSource, gattSource].join('\n');
  assert.doesNotMatch(activeRuntime, /device_identity_key_provision_p256_v1\s*\(/);
  assert.doesNotMatch(activeRuntime, /psa_destroy_key\s*\(/);

  // Provisioner rollback from #658 remains the only destruction authority here.
  const destroyCalls = provisionerSource.match(/psa_destroy_key\s*\(/g) ?? [];
  assert.ok(destroyCalls.length >= 1);

  assert.equal(storage.hardStops.deviceDataTrust, 'BLOCKED');
  assert.equal(storage.hardStops.networkTelemetryPersistence, 'BLOCKED');
});
