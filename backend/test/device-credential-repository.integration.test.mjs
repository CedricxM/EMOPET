import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

const enabled = process.env.DEVICE_CREDENTIAL_DB_INTEGRATION === '1';

const OWNER = 'd6610000-0000-4000-8000-000000000001';
const DOG = 'd6610000-0000-4000-8000-000000000002';
const TAG_A = 'd6610000-0000-4000-8000-000000000003';
const TAG_B = 'd6610000-0000-4000-8000-000000000004';
const MAT = 'd6610000-0000-4000-8000-000000000005';

let sql = null;
let enroll = null;
let resolver = null;
let pendingResolver = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, repoModule, dbModule] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/device-credential-repository.js'),
    import('../dist/db/index.js'),
  ]);
  sql = postgres(process.env.DATABASE_URL, { max: 1 });
  enroll = repoModule.enrollPendingDeviceIdentityCredential;
  resolver = repoModule.durableDevicePopCredentialRepository;
  pendingResolver = repoModule.durablePendingDevicePopCredentialRepository;
  closeDatabase = dbModule.closeDatabase;
}

function publicKeyBase64Url() {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  return Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url');
}

function receipt({
  version = 1,
  slot = 'A',
  keyId = 0x00010000,
  publicKey = publicKeyBase64Url(),
} = {}) {
  return {
    schemaVersion: 'device-identity-enrollment-receipt-v1',
    protocolVersion: 1,
    credentialVersion: version,
    keySlot: slot,
    psaKeyId: keyId,
    algorithm: 'ECDSA_P256_SHA256',
    publicKeyFormat: 'SEC1_UNCOMPRESSED_P256_65',
    publicKey,
    firmwareVersion: '6.1.0',
    hardwareRevision: 'MS88SF3-P0',
    bootstrapRevision: 'fixture-1',
    state: 'PENDING_PROOF',
    privateKeyExported: false,
    devicePrincipalBinding: 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED',
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM device_identity_credentials WHERE device_id IN (${TAG_A}, ${TAG_B}, ${MAT})`;
  await sql`DELETE FROM devices WHERE id IN (${TAG_A}, ${TAG_B}, ${MAT})`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('durable enrollment stores public PENDING_PROOF credentials and refuses implicit activation', {
  skip: !enabled,
}, async () => {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${OWNER}, 'device-credential-661@emopet.invalid', 'test-only', 'Device Owner')
  `;
  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG}, ${OWNER}, 'Credential Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;
  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version) VALUES
      (${TAG_A}, ${DOG}, 'TAG', '02:00:00:66:10:01', '6.1.0'),
      (${TAG_B}, ${DOG}, 'TAG', '02:00:00:66:10:02', '6.1.0'),
      (${MAT}, ${DOG}, 'MAT', '02:00:00:66:10:03', '6.1.0')
  `;

  const firstReceipt = receipt();
  const created = await enroll(TAG_A, firstReceipt);
  assert.equal(created.ok, true, JSON.stringify(created));
  assert.equal(created.credential.deviceId, TAG_A);
  assert.equal(created.credential.credentialVersion, 1);
  assert.equal(created.credential.state, 'PENDING_PROOF');
  assert.equal(created.credential.keySlot, 'A');
  assert.equal(created.credential.psaKeyId, 0x00010000);
  assert.equal(created.credential.publicKeyBase64Url, firstReceipt.publicKey);
  assert.equal(created.credential.privateKeyExported, false);
  assert.equal(created.credential.activatedAt, null);
  assert.equal(created.credential.revokedAt, null);

  const [stored] = await sql`
    SELECT *
    FROM device_identity_credentials
    WHERE device_id = ${TAG_A}
  `;
  assert.equal(stored.state, 'PENDING_PROOF');
  assert.equal(stored.credential_version, '1');
  assert.equal(stored.public_key_base64url, firstReceipt.publicKey);
  assert.equal(stored.private_key_exported, false);
  assert.equal(stored.activated_at, null);

  const active = await resolver.resolveActiveCredential(TAG_A, 1);
  assert.equal(active, null);

  const pending = await pendingResolver.resolvePendingCredential(TAG_A, 1);
  assert.ok(pending);
  assert.equal(pending.deviceId, TAG_A);
  assert.equal(pending.credentialVersion, 1);
  assert.equal(pending.state, 'PENDING_PROOF');
  assert.equal(
    Buffer.from(pending.publicKeySec1).toString('base64url'),
    firstReceipt.publicKey,
  );
  assert.equal(pending.firmwareVersion, '6.1.0');
  assert.equal(pending.hardwareRevision, 'MS88SF3-P0');
  assert.equal(pending.bootstrapRevision, 'fixture-1');
  assert.equal(
    await pendingResolver.resolvePendingCredential(TAG_A, 2),
    null,
  );

  const duplicateVersion = await enroll(TAG_A, receipt({
    version: 1,
    slot: 'B',
    keyId: 0x00010001,
  }));
  assert.deepEqual(duplicateVersion, {
    ok: false,
    error: 'CREDENTIAL_VERSION_EXISTS',
  });

  const occupiedSlot = await enroll(TAG_A, receipt({
    version: 2,
    slot: 'A',
    keyId: 0x00010000,
  }));
  assert.deepEqual(occupiedSlot, {
    ok: false,
    error: 'KEY_SLOT_OCCUPIED',
  });

  const secondPending = await enroll(TAG_A, receipt({
    version: 2,
    slot: 'B',
    keyId: 0x00010001,
  }));
  assert.deepEqual(secondPending, {
    ok: false,
    error: 'PENDING_CREDENTIAL_EXISTS',
  });

  const invalidSlotPair = await enroll(TAG_B, receipt({
    version: 1,
    slot: 'A',
    keyId: 0x00010001,
  }));
  assert.equal(invalidSlotPair.ok, false);
  assert.equal(invalidSlotPair.error, 'INVALID_ENROLLMENT_RECEIPT');

  const invalidSec1 = await enroll(TAG_B, receipt({
    publicKey: 'A'.repeat(87),
  }));
  assert.deepEqual(invalidSec1, {
    ok: false,
    error: 'INVALID_PUBLIC_KEY',
  });

  const matEnrollment = await enroll(MAT, receipt());
  assert.deepEqual(matEnrollment, {
    ok: false,
    error: 'DEVICE_NOT_FOUND_OR_NOT_TAG',
  });

  await assert.rejects(
    sql`
      INSERT INTO device_identity_credentials (
        device_id, credential_version, state, key_slot, psa_key_id,
        algorithm, public_key_format, public_key_base64url,
        firmware_version, hardware_revision, bootstrap_revision,
        private_key_exported, device_principal_binding
      ) VALUES (
        ${TAG_A}, 2, 'PENDING_PROOF', 'B', 65537,
        'ECDSA_P256_SHA256', 'SEC1_UNCOMPRESSED_P256_65', ${publicKeyBase64Url()},
        '6.1.0', 'MS88SF3-P0', 'fixture-1',
        false, 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'
      )
    `,
  );

  await assert.rejects(
    sql`
      INSERT INTO device_identity_credentials (
        device_id, credential_version, state, key_slot, psa_key_id,
        algorithm, public_key_format, public_key_base64url,
        firmware_version, hardware_revision, bootstrap_revision,
        private_key_exported, device_principal_binding
      ) VALUES (
        ${TAG_B}, 2, 'PENDING_PROOF', 'B', 65537,
        'ECDSA_P256_SHA256', 'SEC1_UNCOMPRESSED_P256_65', ${'A'.repeat(87)},
        '6.1.0', 'MS88SF3-P0', 'fixture-1',
        false, 'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'
      )
    `,
  );

  const [{ active_count }] = await sql`
    SELECT count(*)::int AS active_count
    FROM device_identity_credentials
    WHERE state = 'ACTIVE'
  `;
  assert.equal(active_count, 0);
});
