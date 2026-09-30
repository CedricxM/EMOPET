import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const [
  signer,
  header,
  preimage,
  cmake,
  prj,
  runtimeSource,
  mainSource,
  gattSource,
] = await Promise.all([
  read('firmware/collar/ncs/src/device_pop_signer_psa.c'),
  read('firmware/collar/ncs/src/device_pop_signer_psa.h'),
  read('firmware/collar/main/security/device_pop_preimage.c'),
  read('firmware/collar/ncs/CMakeLists.txt'),
  read('firmware/collar/ncs/prj.conf'),
  read('config/security/device-pop-challenge-v1.json'),
  read('firmware/collar/ncs/src/main.c'),
  read('firmware/collar/ncs/src/emopet_gatt.c'),
]);

const runtime = JSON.parse(runtimeSource);

test('PSA signer is pinned to P-256 / SHA-256 / raw 64-byte signature semantics', () => {
  for (const token of [
    'psa_get_key_attributes',
    'PSA_KEY_TYPE_IS_ECC_KEY_PAIR',
    'PSA_KEY_TYPE_ECC_GET_FAMILY',
    'PSA_ECC_FAMILY_SECP_R1',
    'bits == 256u',
    'PSA_KEY_USAGE_SIGN_HASH',
    'PSA_ALG_ECDSA(PSA_ALG_SHA_256)',
    'psa_hash_compute',
    'psa_sign_hash',
    'DEVICE_POP_SIGNATURE_V1_SIZE',
  ]) {
    assert.ok(signer.includes(token) || header.includes(token), token);
  }

  assert.match(header, /DEVICE_POP_SIGNATURE_V1_SIZE\s+64u/);
  assert.match(header, /DEVICE_POP_SHA256_SIZE\s+32u/);
});

test('signer composes the canonical preimage instead of duplicating wire serialization', () => {
  assert.match(signer, /device_pop_build_preimage_v1/);
  assert.match(cmake, /device_pop_preimage\.c/);
  assert.match(cmake, /device_pop_signer_psa\.c/);

  // Domain/wire layout must remain owned by the portable preimage builder.
  assert.match(preimage, /EMOPET_DEVICE_POP_V1/);
  assert.doesNotMatch(signer, /EMOPET_DEVICE_POP_V1/);
  assert.doesNotMatch(signer, /write_u32_be|write_u64_be/);
});

test('signer zeroizes sensitive transient buffers without elidable memset', () => {
  assert.match(signer, /static void secure_zero/);
  assert.match(signer, /volatile uint8_t \*p/);
  assert.match(signer, /secure_zero\(preimage/);
  assert.match(signer, /secure_zero\(digest/);
  assert.doesNotMatch(signer, /memset\s*\(/);
});

test('signer has no key generation, import, export, destruction or storage authority', () => {
  for (const forbidden of [
    /psa_generate_key/,
    /psa_import_key/,
    /psa_export_key/,
    /psa_destroy_key/,
    /psa_set_key_lifetime/,
    /PSA_KEY_LIFETIME_/,
    /private[_ -]?key\s*\[/i,
  ]) {
    assert.doesNotMatch(signer, forbidden);
    assert.doesNotMatch(header, forbidden);
  }

  assert.match(header, /already-provisioned opaque PSA key id/);
  assert.equal(
    runtime.runtime.deviceSigner,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_OPAQUE_PSA_KEY_ID / NO_KEY_GENERATION_OR_STORAGE',
  );
  assert.equal(runtime.runtime.deviceSignerTargetBuildVerified, false);
  assert.match(
    runtime.runtime.devicePrivateKeyProvisioning,
    /SOURCE_PRIMITIVE_IMPLEMENTED/,
  );
  assert.match(
    runtime.runtime.devicePrivateKeyProvisioning,
    /DEFAULT_OFF_KCONFIG/,
  );
  assert.match(
    runtime.runtime.devicePrivateKeyProvisioning,
    /TARGET_HUK_SECURE_STORAGE_PROOF_OPEN/,
  );
  assert.match(
    runtime.runtime.devicePrivateKeyStorage,
    /PRODUCTION_STORAGE_NOT_PROVEN/,
  );
});

test('NCS source enables only the crypto features required by this signer', () => {
  for (const option of [
    'CONFIG_PSA_CRYPTO=y',
    'CONFIG_PSA_WANT_ALG_SHA_256=y',
    'CONFIG_PSA_WANT_ALG_ECDSA=y',
    'CONFIG_PSA_WANT_ECC_SECP_R1_256=y',
  ]) {
    assert.ok(prj.includes(option), option);
  }
});

test('source signer is not activated by TAG runtime yet', () => {
  const active = [mainSource, gattSource].join('\n');
  assert.doesNotMatch(active, /device_pop_sign_challenge_v1\s*\(/);
  assert.doesNotMatch(active, /psa_sign_hash\s*\(/);
});
