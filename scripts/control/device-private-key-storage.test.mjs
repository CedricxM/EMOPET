import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const [
  authoritySource,
  evaluationSource,
  kconfig,
  cmake,
  prj,
  header,
  source,
  main,
  gatt,
  signer,
] = await Promise.all([
  read('config/security/device-private-key-storage-v1.json'),
  read('config/security/device-identity-pop-evaluation-v1.json'),
  read('firmware/collar/ncs/Kconfig'),
  read('firmware/collar/ncs/CMakeLists.txt'),
  read('firmware/collar/ncs/prj.conf'),
  read('firmware/collar/ncs/src/device_identity_key_provisioner_psa.h'),
  read('firmware/collar/ncs/src/device_identity_key_provisioner_psa.c'),
  read('firmware/collar/ncs/src/main.c'),
  read('firmware/collar/ncs/src/emopet_gatt.c'),
  read('firmware/collar/ncs/src/device_pop_signer_psa.c'),
]);

const authority = JSON.parse(authoritySource);
const evaluation = JSON.parse(evaluationSource);

test('private-key provisioning source is disabled until Secure Storage + HUK prerequisites exist', () => {
  assert.match(kconfig, /source "Kconfig\.zephyr"/);
  assert.match(kconfig, /config EMOPET_DEVICE_KEY_PROVISIONING/);
  assert.match(kconfig, /default n/);

  for (const dependency of [
    'PSA_CRYPTO',
    'SECURE_STORAGE',
    'HW_UNIQUE_KEY',
    'SECURE_STORAGE_ITS_TRANSFORM_AEAD_KEY_PROVIDER_HUK_LIBRARY',
  ]) {
    assert.ok(kconfig.includes(`depends on ${dependency}`), dependency);
  }

  assert.match(
    cmake,
    /if\(CONFIG_EMOPET_DEVICE_KEY_PROVISIONING\)[\s\S]*device_identity_key_provisioner_psa\.c[\s\S]*endif\(\)/,
  );

  for (const forbiddenEnable of [
    /^CONFIG_EMOPET_DEVICE_KEY_PROVISIONING=y$/m,
    /^CONFIG_SECURE_STORAGE=y$/m,
    /^CONFIG_HW_UNIQUE_KEY=y$/m,
    /^CONFIG_SECURE_STORAGE_ITS_TRANSFORM_AEAD_KEY_PROVIDER_HUK_LIBRARY=y$/m,
  ]) {
    assert.doesNotMatch(prj, forbiddenEnable);
  }

  assert.equal(authority.source.runtimeEnabledByDefault, false);
  assert.equal(authority.evidence.ncsTargetBuildVerified, false);
  assert.equal(authority.evidence.hukProvisionedOnRepresentativeTarget, false);
  assert.equal(authority.evidence.secureStorageHukPathVerified, false);
});

test('provisioner creates one persistent P-256 SIGN_HASH key without private-key export/import', () => {
  for (const token of [
    'psa_get_key_attributes',
    'PSA_ERROR_DOES_NOT_EXIST',
    'PSA_KEY_TYPE_ECC_KEY_PAIR(PSA_ECC_FAMILY_SECP_R1)',
    'psa_set_key_bits(&attrs, 256u)',
    'PSA_KEY_USAGE_SIGN_HASH',
    'PSA_ALG_ECDSA(PSA_ALG_SHA_256)',
    'PSA_KEY_LIFETIME_PERSISTENT',
    'psa_set_key_id',
    'psa_generate_key',
    'psa_export_public_key',
    'DEVICE_IDENTITY_P256_PUBLIC_KEY_SIZE',
    'public_key_sec1[0] != 0x04u',
  ]) {
    assert.ok(source.includes(token) || header.includes(token), token);
  }

  assert.match(header, /DEVICE_IDENTITY_P256_PUBLIC_KEY_SIZE\s+65u/);

  for (const forbidden of [
    /psa_import_key\s*\(/,
    /psa_export_key\s*\(/,
    /private[_ -]?key\s*\[/i,
    /static\s+const\s+psa_key_id_t/i,
  ]) {
    assert.doesNotMatch(source, forbidden);
    assert.doesNotMatch(header, forbidden);
  }
});

test('duplicate and partial provisioning fail closed with rollback limited to newly-created key', () => {
  assert.match(source, /DEVICE_IDENTITY_KEY_PROVISION_ALREADY_EXISTS/);
  assert.match(source, /lookup_status == PSA_SUCCESS/);
  assert.match(source, /lookup_status != PSA_ERROR_DOES_NOT_EXIST/);
  assert.match(source, /static device_identity_key_provision_result_t\s+rollback_generated_key/);
  assert.match(source, /psa_destroy_key\(key_id\)/);
  assert.match(source, /psa_destroy_key\(generated_id\)/);
  assert.match(source, /DEVICE_IDENTITY_KEY_PROVISION_ROLLBACK_ERROR/);

  // There is no general public destruction API.
  assert.doesNotMatch(header, /destroy.*key/i);
});

test('credential binding uses the reserved A/B namespace while destructive lifecycle remains open', () => {
  assert.match(header, /uint32_t credential_version/);
  assert.match(source, /credential_version == 0u/);
  assert.match(source, /receipt->key_id = key_id/);
  assert.match(source, /receipt->credential_version = credential_version/);

  assert.equal(
    authority.selectedStorage.applicationKeyIdNamespace,
    'EMOPET_DEVICE_TRUST_BLOCK_0x00010000_0x0001000F / IDENTITY_SLOTS_A_B',
  );
  assert.equal(
    authority.selectedStorage.keyIdRegistry,
    'config/security/psa-key-id-registry-v1.json',
  );
  assert.deepEqual(
    authority.selectedStorage.identitySlots,
    { A: '0x00010000', B: '0x00010001' },
  );
  assert.equal(authority.evidence.applicationKeyIdNamespaceSelected, true);

  assert.match(
    authority.lifecycle.rotation,
    /^DUAL_SLOT_A_B_SELECTED \/ ACTIVE_PLUS_PENDING_MAX_ONE_EACH \/ DESTRUCTIVE_RUNTIME_OPEN$/,
  );
  assert.equal(authority.lifecycle.revocation, 'OPEN');
  assert.equal(authority.lifecycle.rma, 'OPEN');
});

test('source provisioning cannot activate Device Data Trust or telemetry persistence', () => {
  const active = [main, gatt, signer].join('\n');
  assert.doesNotMatch(active, /device_identity_key_provision_p256_v1\s*\(/);

  assert.equal(authority.hardStops.deviceDataTrust, 'BLOCKED');
  assert.equal(authority.hardStops.networkTelemetryPersistence, 'BLOCKED');
  assert.equal(authority.hardStops.claimBind, 'BLOCKED');
  assert.equal(authority.hardStops.trustedCommands, 'BLOCKED');
  assert.equal(
    authority.currentDecision,
    'DO_NOT_ENABLE_DEVICE_IDENTITY_KEY_PROVISIONING_RUNTIME',
  );

  assert.equal(evaluation.runtime.deviceDataTrust, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.networkTelemetryPersistence, 'BLOCKED');
});

test('nRF52840 storage authority does not invent KMU isolation', () => {
  assert.equal(authority.target.soc, 'nRF52840');
  assert.equal(authority.target.kmuPresent, false);
  assert.equal(authority.target.supportedHukType, 'KDR_ONLY');
  assert.equal(authority.selectedStorage.nsibRequired, true);
  assert.equal(authority.selectedStorage.storageSubsystem, 'NCS_SECURE_STORAGE');
  assert.equal(authority.selectedStorage.atRestProtection, 'HUK_KDR_DERIVED_AEAD');
});
