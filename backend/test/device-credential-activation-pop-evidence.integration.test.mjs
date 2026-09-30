import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';

const enabled =
  process.env.DEVICE_ACTIVATION_POP_EVIDENCE_DB_INTEGRATION === '1';

const OWNER = 'd8030000-0000-4000-8000-000000000001';
const DOG = 'd8030000-0000-4000-8000-000000000002';
const TAG = 'd8030000-0000-4000-8000-000000000003';
const CREDENTIAL = 'd8030000-0000-4000-8000-000000000004';
const CHALLENGE_A = 'd8030000-0000-4000-8000-000000000005';
const CHALLENGE_B = 'd8030000-0000-4000-8000-000000000006';
const RECEIPT_A = 'd8030000-0000-4000-8000-000000000007';
const RECEIPT_B = 'd8030000-0000-4000-8000-000000000008';
const NOW = new Date('2026-09-30T20:10:00.000Z');

let sql = null;
let closeDatabase = null;
let verifier = null;
let buildPreimage = null;
let evidenceStore = null;
let challengeStore = null;
let pendingCredentials = null;

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

if (enabled) {
  const [
    { default: postgres },
    verifierModule,
    commonVerifierModule,
    evidenceModule,
    challengeModule,
    credentialModule,
    dbModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/device-credential-activation-pop-verifier.js'),
    import('../dist/api/security/device-pop-verifier.js'),
    import('../dist/api/security/device-credential-activation-pop-evidence-repository.js'),
    import('../dist/api/security/device-pop-challenge-repository.js'),
    import('../dist/api/security/device-credential-repository.js'),
    import('../dist/db/index.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 3 });
  verifier = verifierModule.verifyDeviceCredentialActivationPopResponseV1;
  buildPreimage = commonVerifierModule.buildDevicePopSigningPreimageV1;
  evidenceStore =
    evidenceModule.durableDeviceCredentialActivationPopEvidenceRepository;
  challengeStore = challengeModule.durableDevicePopChallengeRepository;
  pendingCredentials =
    credentialModule.durablePendingDevicePopCredentialRepository;
  closeDatabase = dbModule.closeDatabase;
}

function sec1PublicKeyBase64Url() {
  const jwk = publicKey.export({ format: 'jwk' });
  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]).toString('base64url');
}

function challenge({
  challengeId = CHALLENGE_A,
  purpose = 'DEVICE_CREDENTIAL_ACTIVATION',
  credentialVersion = 7,
  issuedAt = '2026-09-30T20:09:00.000Z',
  expiresAt = '2026-09-30T20:11:00.000Z',
} = {}) {
  return {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId: TAG,
    credentialVersion,
    purpose,
    challengeId,
    nonce: Buffer.alloc(32, 0x5a).toString('base64url'),
    issuedAt,
    expiresAt,
    signingContract: 'EMOPET_DEVICE_POP_FIXED_BINARY_V1',
  };
}

function signedResponse(challengeValue) {
  const signature = sign(
    'sha256',
    buildPreimage(challengeValue),
    {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    },
  );

  return {
    schemaVersion: 'device-pop-response-v1',
    protocolVersion: 1,
    deviceId: challengeValue.deviceId,
    credentialVersion: challengeValue.credentialVersion,
    purpose: challengeValue.purpose,
    challengeId: challengeValue.challengeId,
    signatureFormat: 'ECDSA_P256_SHA256_P1363_64',
    signature: signature.toString('base64url'),
  };
}

async function cleanup() {
  if (!sql) return;
  await sql`
    DELETE FROM device_credential_activation_pop_receipts
    WHERE device_id = ${TAG}
  `;
  await sql`DELETE FROM device_pop_challenges WHERE device_id = ${TAG}`;
  await sql`
    DELETE FROM device_identity_credentials
    WHERE device_id = ${TAG}
  `;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

async function seedBase() {
  await cleanup();

  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (
      ${OWNER},
      'device-pop-803@emopet.invalid',
      'test-only',
      'M4 Owner'
    )
  `;

  await sql`
    INSERT INTO dogs (id, owner_id, name, breed, birth_date, sex, weight, fur_class)
    VALUES (
      ${DOG},
      ${OWNER},
      'M4 Dog',
      'Test',
      '2020-01-01',
      'female',
      20.0,
      'FC2'
    )
  `;

  await sql`
    INSERT INTO devices (id, dog_id, type, mac_address, firmware_version)
    VALUES (
      ${TAG},
      ${DOG},
      'TAG',
      '02:00:00:80:30:01',
      '6.1.0'
    )
  `;

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
      device_principal_binding
    )
    VALUES (
      ${CREDENTIAL},
      ${TAG},
      7,
      'PENDING_PROOF',
      'A',
      65536,
      'ECDSA_P256_SHA256',
      'SEC1_UNCOMPRESSED_P256_65',
      ${sec1PublicKeyBase64Url()},
      'fw-803',
      'MS88SF3-G2',
      'bootstrap-803',
      false,
      'BACKEND_MANUFACTURING_AUTHORITY_REQUIRED'
    )
  `;
}

async function createChallenge(value) {
  assert.equal(
    await challengeStore.createIfAbsent({
      challenge: value,
      consumedAt: null,
    }),
    true,
  );
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('real ECDSA M4 verification atomically consumes challenge and persists #771-readable receipt', {
  skip: !enabled,
}, async () => {
  await seedBase();
  const current = challenge();
  await createChallenge(current);

  const result = await verifier(
    signedResponse(current),
    {
      challenges: challengeStore,
      pendingCredentials,
      popEvidence: evidenceStore,
      now: () => NOW,
      randomUuid: () => RECEIPT_A,
    },
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.proof.receiptId, RECEIPT_A);
  assert.equal(result.proof.challengeId, CHALLENGE_A);
  assert.equal(result.proof.verificationResult, 'VERIFIED_AND_CONSUMED');

  const stored = await evidenceStore.findByReceiptId(RECEIPT_A);
  assert.deepEqual(stored, {
    receiptId: RECEIPT_A,
    authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
    deviceId: TAG,
    credentialVersion: 7,
    challengeId: CHALLENGE_A,
    verificationResult: 'VERIFIED_AND_CONSUMED',
    verifiedAt: NOW.toISOString(),
    consumedAt: NOW.toISOString(),
  });

  const challengeState = await challengeStore.findByChallengeId(CHALLENGE_A);
  assert.equal(challengeState.consumedAt, NOW.toISOString());

  const [row] = await sql`
    SELECT *
    FROM device_credential_activation_pop_receipts
    WHERE receipt_id = ${RECEIPT_A}
  `;
  assert.equal(row.device_id, TAG);
  assert.equal(row.credential_version, '7');
  assert.equal(row.challenge_id, CHALLENGE_A);
  assert.equal(row.purpose, 'DEVICE_CREDENTIAL_ACTIVATION');
  assert.equal(row.authority, 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY');
  assert.equal(row.verification_result, 'VERIFIED_AND_CONSUMED');
  assert.equal('signature' in row, false);
  assert.equal('nonce' in row, false);
  assert.equal('public_key' in row, false);
  assert.equal('private_key' in row, false);
});

test('two concurrent M4 evidence commits for one challenge yield exactly one winner', {
  skip: !enabled,
}, async () => {
  await seedBase();
  await createChallenge(challenge());

  const base = {
    deviceId: TAG,
    credentialVersion: 7,
    challengeId: CHALLENGE_A,
    verifiedAt: NOW.toISOString(),
    consumedAt: NOW.toISOString(),
  };

  const results = await Promise.all([
    evidenceStore.consumeAndPersistVerifiedEvidence({
      ...base,
      receiptId: RECEIPT_A,
    }),
    evidenceStore.consumeAndPersistVerifiedEvidence({
      ...base,
      receiptId: RECEIPT_B,
    }),
  ]);

  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.filter((value) => value == null).length, 1);

  const [countRow] = await sql`
    SELECT count(*)::int AS count
    FROM device_credential_activation_pop_receipts
    WHERE challenge_id = ${CHALLENGE_A}
  `;
  assert.equal(countRow.count, 1);
});

test('receipt insert failure rolls challenge consumption back', {
  skip: !enabled,
}, async () => {
  await seedBase();
  await createChallenge(challenge({ challengeId: CHALLENGE_A }));
  await createChallenge(challenge({ challengeId: CHALLENGE_B }));

  // Occupy RECEIPT_A with CHALLENGE_B using the repository itself.
  assert.ok(
    await evidenceStore.consumeAndPersistVerifiedEvidence({
      receiptId: RECEIPT_A,
      deviceId: TAG,
      credentialVersion: 7,
      challengeId: CHALLENGE_B,
      verifiedAt: NOW.toISOString(),
      consumedAt: NOW.toISOString(),
    }),
  );

  await assert.rejects(
    evidenceStore.consumeAndPersistVerifiedEvidence({
      receiptId: RECEIPT_A,
      deviceId: TAG,
      credentialVersion: 7,
      challengeId: CHALLENGE_A,
      verifiedAt: NOW.toISOString(),
      consumedAt: NOW.toISOString(),
    }),
  );

  const state = await challengeStore.findByChallengeId(CHALLENGE_A);
  assert.equal(state.consumedAt, null);
});

test('telemetry purpose can never create a manufacturing M4 receipt', {
  skip: !enabled,
}, async () => {
  await seedBase();
  await createChallenge(challenge({
    purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
  }));

  const result = await evidenceStore.consumeAndPersistVerifiedEvidence({
    receiptId: RECEIPT_A,
    deviceId: TAG,
    credentialVersion: 7,
    challengeId: CHALLENGE_A,
    verifiedAt: NOW.toISOString(),
    consumedAt: NOW.toISOString(),
  });

  assert.equal(result, null);
  const state = await challengeStore.findByChallengeId(CHALLENGE_A);
  assert.equal(state.consumedAt, null);
  assert.equal(await evidenceStore.findByReceiptId(RECEIPT_A), null);
});

test('wrong credential version and expired evidence time fail without consuming', {
  skip: !enabled,
}, async () => {
  await seedBase();
  await createChallenge(challenge());

  assert.equal(
    await evidenceStore.consumeAndPersistVerifiedEvidence({
      receiptId: RECEIPT_A,
      deviceId: TAG,
      credentialVersion: 8,
      challengeId: CHALLENGE_A,
      verifiedAt: NOW.toISOString(),
      consumedAt: NOW.toISOString(),
    }),
    null,
  );

  assert.equal(
    await evidenceStore.consumeAndPersistVerifiedEvidence({
      receiptId: RECEIPT_B,
      deviceId: TAG,
      credentialVersion: 7,
      challengeId: CHALLENGE_A,
      verifiedAt: '2026-09-30T20:11:00.000Z',
      consumedAt: '2026-09-30T20:11:00.000Z',
    }),
    null,
  );

  const state = await challengeStore.findByChallengeId(CHALLENGE_A);
  assert.equal(state.consumedAt, null);
});
