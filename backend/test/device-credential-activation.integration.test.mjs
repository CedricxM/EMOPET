import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';

const enabled = process.env.DEVICE_CREDENTIAL_ACTIVATION_DB_INTEGRATION === '1';

const OWNER = 'd7200000-0000-4000-8000-000000000001';
const DOG = 'd7200000-0000-4000-8000-000000000002';
const TAG = 'd7200000-0000-4000-8000-000000000003';

let sql = null;
let commitActivation = null;
let resolver = null;
let closeDatabase = null;

if (enabled) {
  const [{ default: postgres }, activationModule, credentialModule, dbModule] =
    await Promise.all([
      import('postgres'),
      import('../dist/api/security/device-credential-activation-transaction.js'),
      import('../dist/api/security/device-credential-repository.js'),
      import('../dist/db/index.js'),
    ]);

  sql = postgres(process.env.DATABASE_URL, { max: 4 });
  commitActivation =
    activationModule.commitVerifiedDeviceCredentialActivationReceipt;
  resolver = credentialModule.durableDevicePopCredentialRepository;
  closeDatabase = dbModule.closeDatabase;
}

function publicKeyBase64Url() {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' });
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  return Buffer.concat([Buffer.from([0x04]), x, y]).toString('base64url');
}

async function cleanup() {
  if (!sql) return;
  await sql`DELETE FROM device_credential_activation_receipts WHERE device_id = ${TAG}`;
  await sql`DELETE FROM device_identity_credentials WHERE device_id = ${TAG}`;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

async function seedDevice() {
  await cleanup();
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${OWNER}, 'device-activation-720@emopet.invalid', 'test-only', 'Activation Owner')
  `;
  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (${DOG}, ${OWNER}, 'Activation Dog', 'Test', '2020-01-01', 'female', 20.0, 'FC2')
  `;
  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (${TAG}, ${DOG}, 'TAG', '02:00:00:72:00:01', '6.1.0')
  `;
}

async function insertCredential({
  id,
  version,
  slot,
  keyId,
  state,
  activatedAt = null,
  revokedAt = null,
}) {
  await sql`
    INSERT INTO device_identity_credentials (
      id,
      device_id,
      credential_version,
      state,
      key_slot,
      psa_key_id,
      algorithm,
      public_key_format,
      public_key_base64url,
      firmware_version,
      hardware_revision,
      bootstrap_revision,
      private_key_exported,
      device_principal_binding,
      activated_at,
      revoked_at
    ) VALUES (
      ${id},
      ${TAG},
      ${version},
      ${state},
      ${slot},
      ${keyId},
      'ECDSA_P256_SHA256',
      'SEC1_UNCOMPRESSED_P256_65',
      ${publicKeyBase64Url()},
      '6.1.0',
      'MS88SF3-P0',
      'fixture-1',
      false,
      'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED',
      ${activatedAt},
      ${revokedAt}
    )
  `;
}

function receipt({
  activationId = 'd7200000-0000-4000-8000-000000000010',
  credentialVersion = 1,
  predecessorCredentialVersion = null,
  cutoverType = 'INITIAL',
  predecessorResultingState = 'NONE',
  hardwareRevision = 'MS88SF3-P0',
} = {}) {
  return {
    schemaVersion: 'device-credential-activation-receipt-v1',
    protocolVersion: 1,
    activationId,
    deviceId: TAG,
    credentialVersion,
    predecessorCredentialVersion,
    cutoverType,
    evidenceRefs: {
      schemaVersion: 'device-credential-activation-evidence-refs-v1',
      protocolVersion: 1,
      deviceId: TAG,
      pendingCredentialVersion: credentialVersion,
      popVerificationReceiptId: 'd7200000-0000-4000-8000-000000000020',
      popChallengeId: 'd7200000-0000-4000-8000-000000000021',
      debugStateReceiptId: 'd7200000-0000-4000-8000-000000000022',
      targetEvidenceReceiptId: 'd7200000-0000-4000-8000-000000000023',
      firmwareVersion: '6.1.0',
      hardwareRevision,
      bootstrapRevision: 'fixture-1',
      predecessorCredentialVersion,
      authority: 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY',
      recordedAt: '2026-09-30T08:59:00.000Z',
    },
    resultingCredentialState: 'ACTIVE',
    predecessorResultingState,
    activatedAt: '2026-09-30T09:00:00.000Z',
    deviceDataTrustAuthorized: false,
    networkTelemetryPersistenceAuthorized: false,
  };
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('initial activation moves exactly one PENDING_PROOF credential to ACTIVE and stores receipt', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000101',
    version: 1,
    slot: 'A',
    keyId: 65536,
    state: 'PENDING_PROOF',
  });

  const input = receipt();
  const result = await commitActivation(input);
  assert.equal(result.ok, true, JSON.stringify(result));

  const rows = await sql`
    SELECT credential_version, state, activated_at, revoked_at
    FROM device_identity_credentials
    WHERE device_id = ${TAG}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].credential_version, '1');
  assert.equal(rows[0].state, 'ACTIVE');
  assert.equal(rows[0].activated_at.toISOString(), input.activatedAt);
  assert.equal(rows[0].revoked_at, null);

  const receipts = await sql`
    SELECT *
    FROM device_credential_activation_receipts
    WHERE device_id = ${TAG}
  `;
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].activation_id, input.activationId);
  assert.equal(receipts[0].cutover_type, 'INITIAL');
  assert.equal(receipts[0].predecessor_credential_id, null);
  assert.equal(receipts[0].predecessor_resulting_state, 'NONE');
  assert.equal(receipts[0].device_data_trust_authorized, false);
  assert.equal(receipts[0].network_telemetry_persistence_authorized, false);

  const active = await resolver.resolveActiveCredential(TAG, 1);
  assert.equal(active?.credentialVersion, 1);
  assert.equal(active?.state, 'ACTIVE');
});

test('rotation retires old ACTIVE and activates new PENDING in one cutover timestamp', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000111',
    version: 1,
    slot: 'A',
    keyId: 65536,
    state: 'ACTIVE',
    activatedAt: '2026-09-29T09:00:00.000Z',
  });
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000112',
    version: 2,
    slot: 'B',
    keyId: 65537,
    state: 'PENDING_PROOF',
  });

  const input = receipt({
    activationId: 'd7200000-0000-4000-8000-000000000011',
    credentialVersion: 2,
    predecessorCredentialVersion: 1,
    cutoverType: 'ROTATION',
    predecessorResultingState: 'REVOKED_PENDING_ERASE',
  });

  const result = await commitActivation(input);
  assert.equal(result.ok, true, JSON.stringify(result));

  const rows = await sql`
    SELECT credential_version, state, activated_at, revoked_at
    FROM device_identity_credentials
    WHERE device_id = ${TAG}
    ORDER BY credential_version
  `;

  assert.equal(rows.length, 2);
  assert.equal(rows[0].state, 'REVOKED_PENDING_ERASE');
  assert.equal(rows[0].revoked_at.toISOString(), input.activatedAt);
  assert.equal(rows[1].state, 'ACTIVE');
  assert.equal(rows[1].activated_at.toISOString(), input.activatedAt);

  const [{ active_count }] = await sql`
    SELECT count(*)::int AS active_count
    FROM device_identity_credentials
    WHERE device_id = ${TAG} AND state = 'ACTIVE'
  `;
  assert.equal(active_count, 1);

  const [stored] = await sql`
    SELECT predecessor_credential_version, predecessor_resulting_state
    FROM device_credential_activation_receipts
    WHERE activation_id = ${input.activationId}
  `;
  assert.equal(stored.predecessor_credential_version, '1');
  assert.equal(stored.predecessor_resulting_state, 'REVOKED_PENDING_ERASE');
});

test('two concurrent activation attempts yield exactly one winner', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000121',
    version: 1,
    slot: 'A',
    keyId: 65536,
    state: 'PENDING_PROOF',
  });

  const [a, b] = await Promise.all([
    commitActivation(receipt({
      activationId: 'd7200000-0000-4000-8000-000000000012',
    })),
    commitActivation(receipt({
      activationId: 'd7200000-0000-4000-8000-000000000013',
    })),
  ]);

  const winners = [a, b].filter((value) => value.ok);
  const losers = [a, b].filter((value) => !value.ok);
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.ok([
    'PENDING_CREDENTIAL_NOT_FOUND',
    'ACTIVE_CREDENTIAL_EXISTS',
    'ACTIVATION_RECEIPT_EXISTS',
  ].includes(losers[0].error));

  const [{ active_count }] = await sql`
    SELECT count(*)::int AS active_count
    FROM device_identity_credentials
    WHERE device_id = ${TAG} AND state = 'ACTIVE'
  `;
  assert.equal(active_count, 1);

  const [{ receipt_count }] = await sql`
    SELECT count(*)::int AS receipt_count
    FROM device_credential_activation_receipts
    WHERE device_id = ${TAG}
  `;
  assert.equal(receipt_count, 1);
});

test('provenance mismatch fails closed without credential mutation or receipt', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000131',
    version: 1,
    slot: 'A',
    keyId: 65536,
    state: 'PENDING_PROOF',
  });

  const result = await commitActivation(receipt({
    activationId: 'd7200000-0000-4000-8000-000000000014',
    hardwareRevision: 'WRONG-TARGET',
  }));
  assert.deepEqual(result, {
    ok: false,
    error: 'CREDENTIAL_PROVENANCE_MISMATCH',
  });

  const [credential] = await sql`
    SELECT state, activated_at
    FROM device_identity_credentials
    WHERE device_id = ${TAG}
  `;
  assert.equal(credential.state, 'PENDING_PROOF');
  assert.equal(credential.activated_at, null);

  const [{ receipt_count }] = await sql`
    SELECT count(*)::int AS receipt_count
    FROM device_credential_activation_receipts
    WHERE device_id = ${TAG}
  `;
  assert.equal(receipt_count, 0);
});

test('rotation with the wrong predecessor fails closed', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000141',
    version: 1,
    slot: 'A',
    keyId: 65536,
    state: 'ACTIVE',
    activatedAt: '2026-09-29T09:00:00.000Z',
  });
  await insertCredential({
    id: 'd7200000-0000-4000-8000-000000000142',
    version: 2,
    slot: 'B',
    keyId: 65537,
    state: 'PENDING_PROOF',
  });

  const result = await commitActivation(receipt({
    activationId: 'd7200000-0000-4000-8000-000000000015',
    credentialVersion: 2,
    predecessorCredentialVersion: 3,
    cutoverType: 'ROTATION',
    predecessorResultingState: 'REVOKED_PENDING_ERASE',
  }));
  assert.deepEqual(result, {
    ok: false,
    error: 'PREDECESSOR_NOT_ACTIVE',
  });

  const rows = await sql`
    SELECT credential_version, state
    FROM device_identity_credentials
    WHERE device_id = ${TAG}
    ORDER BY credential_version
  `;
  assert.equal(rows[0].state, 'ACTIVE');
  assert.equal(rows[1].state, 'PENDING_PROOF');
});
