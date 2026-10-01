import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';

const enabled =
  process.env.DEVICE_CREDENTIAL_ACTIVATION_POP_DB_INTEGRATION === '1';

const OWNER = 'd8030000-0000-4000-8000-000000000001';
const DOG = 'd8030000-0000-4000-8000-000000000002';
const TAG = 'd8030000-0000-4000-8000-000000000003';
const CHALLENGE_A = 'd8030000-0000-4000-8000-000000000004';
const CHALLENGE_B = 'd8030000-0000-4000-8000-000000000005';
const CHALLENGE_C = 'd8030000-0000-4000-8000-000000000006';
const RECEIPT = 'd8030000-0000-4000-8000-000000000010';

const NOW = new Date('2026-09-30T20:30:00.000Z');

let sql = null;
let repository = null;
let verifyActivationPop = null;
let buildPreimage = null;
let closeDatabase = null;

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

if (enabled) {
  const [
    { default: postgres },
    evidenceModule,
    verifierModule,
    popModule,
    dbModule,
  ] = await Promise.all([
    import('postgres'),
    import('../dist/api/security/device-credential-activation-pop-evidence-repository.js'),
    import('../dist/api/security/device-credential-activation-pop-verifier.js'),
    import('../dist/api/security/device-pop-verifier.js'),
    import('../dist/db/index.js'),
  ]);

  sql = postgres(process.env.DATABASE_URL, { max: 6 });
  repository =
    evidenceModule.durableDeviceCredentialActivationPopEvidenceRepository;
  verifyActivationPop =
    verifierModule.verifyDeviceCredentialActivationPopResponseV1;
  buildPreimage = popModule.buildDevicePopSigningPreimageV1;
  closeDatabase = dbModule.closeDatabase;
}

function sec1PublicKey() {
  const jwk = publicKey.export({ format: 'jwk' });
  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]);
}

function challenge({
  challengeId = CHALLENGE_A,
  deviceId = TAG,
  credentialVersion = 7,
  purpose = 'DEVICE_CREDENTIAL_ACTIVATION',
  issuedAt = '2026-09-30T20:29:00.000Z',
  expiresAt = '2026-09-30T20:31:00.000Z',
} = {}) {
  return {
    schemaVersion: 'device-pop-challenge-v1',
    protocolVersion: 1,
    deviceId,
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
  const preimage = buildPreimage(challengeValue);
  const signature = sign('sha256', preimage, {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

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
  await sql`
    DELETE FROM device_pop_challenges
    WHERE device_id = ${TAG}
  `;
  await sql`DELETE FROM devices WHERE id = ${TAG}`;
  await sql`DELETE FROM dogs WHERE id = ${DOG}`;
  await sql`DELETE FROM users WHERE id = ${OWNER}`;
}

async function seedDevice() {
  await cleanup();
  await sql`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (
      ${OWNER},
      'device-m4-803@emopet.invalid',
      'test-only',
      'M4 Owner'
    )
  `;
  await sql`
    INSERT INTO dogs (
      id, owner_id, name, breed, birth_date, sex, weight, fur_class
    ) VALUES (
      ${DOG}, ${OWNER}, 'M4 Dog', 'Test', '2020-01-01',
      'female', 20.0, 'FC2'
    )
  `;
  await sql`
    INSERT INTO devices (
      id, dog_id, type, mac_address, firmware_version
    ) VALUES (
      ${TAG}, ${DOG}, 'TAG', '02:00:00:80:30:01', '6.1.0'
    )
  `;
}

async function insertChallenge(value, consumedAt = null) {
  await sql`
    INSERT INTO device_pop_challenges (
      challenge_id,
      device_id,
      credential_version,
      purpose,
      nonce,
      issued_at,
      expires_at,
      signing_contract,
      consumed_at
    ) VALUES (
      ${value.challengeId},
      ${value.deviceId},
      ${value.credentialVersion},
      ${value.purpose},
      ${value.nonce},
      ${value.issuedAt},
      ${value.expiresAt},
      ${value.signingContract},
      ${consumedAt}
    )
  `;
}

function durableVerifierDependencies(receiptId = RECEIPT) {
  return {
    challenges: {
      async findByChallengeId(challengeId) {
        const rows = await sql`
          SELECT *
          FROM device_pop_challenges
          WHERE challenge_id = ${challengeId}
        `;
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          challenge: challenge({
            challengeId: row.challenge_id,
            deviceId: row.device_id,
            credentialVersion: Number(row.credential_version),
            purpose: row.purpose,
            issuedAt: row.issued_at.toISOString(),
            expiresAt: row.expires_at.toISOString(),
          }),
          consumedAt: row.consumed_at?.toISOString() ?? null,
        };
      },
    },
    pendingCredentials: {
      async resolvePendingCredential(deviceId, credentialVersion) {
        return {
          deviceId,
          credentialVersion,
          state: 'PENDING_PROOF',
          publicKeySec1: sec1PublicKey(),
        };
      },
    },
    evidence: repository,
    now: () => NOW,
    randomUuid: () => receiptId,
  };
}

after(async () => {
  if (sql) {
    await cleanup();
    await sql.end({ timeout: 5 });
  }
  if (closeDatabase) await closeDatabase();
});

test('valid activation proof atomically consumes challenge and persists one M4 receipt', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  const value = challenge();
  await insertChallenge(value);

  const result = await verifyActivationPop(
    signedResponse(value),
    durableVerifierDependencies(),
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.proof.receiptId, RECEIPT);

  const [challengeRow] = await sql`
    SELECT consumed_at
    FROM device_pop_challenges
    WHERE challenge_id = ${CHALLENGE_A}
  `;
  assert.equal(challengeRow.consumed_at.toISOString(), NOW.toISOString());

  const rows = await sql`
    SELECT *
    FROM device_credential_activation_pop_receipts
    WHERE receipt_id = ${RECEIPT}
  `;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].device_id, TAG);
  assert.equal(rows[0].credential_version, '7');
  assert.equal(rows[0].challenge_id, CHALLENGE_A);
  assert.equal(
    rows[0].authority,
    'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
  );
  assert.equal(rows[0].verification_result, 'VERIFIED_AND_CONSUMED');
  assert.equal(rows[0].verified_at.toISOString(), NOW.toISOString());
  assert.equal(rows[0].consumed_at.toISOString(), NOW.toISOString());

  const evidence = await repository.findByReceiptId(RECEIPT);
  assert.deepEqual(evidence, {
    receiptId: RECEIPT,
    authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY',
    deviceId: TAG,
    credentialVersion: 7,
    challengeId: CHALLENGE_A,
    verificationResult: 'VERIFIED_AND_CONSUMED',
    verifiedAt: NOW.toISOString(),
    consumedAt: NOW.toISOString(),
  });
});

test('two concurrent durable M4 commits yield exactly one winner', {
  skip: !enabled,
}, async () => {
  await seedDevice();
  const value = challenge();
  await insertChallenge(value);

  const [a, b] = await Promise.all([
    verifyActivationPop(
      signedResponse(value),
      durableVerifierDependencies(
        'd8030000-0000-4000-8000-000000000011',
      ),
    ),
    verifyActivationPop(
      signedResponse(value),
      durableVerifierDependencies(
        'd8030000-0000-4000-8000-000000000012',
      ),
    ),
  ]);

  const winners = [a, b].filter((entry) => entry.ok);
  const losers = [a, b].filter((entry) => !entry.ok);

  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.ok(
    [
      'CHALLENGE_CONSUME_CONFLICT',
      'CHALLENGE_ALREADY_CONSUMED',
    ].includes(losers[0].error),
    JSON.stringify(losers[0]),
  );

  const [{ receipt_count }] = await sql`
    SELECT count(*)::int AS receipt_count
    FROM device_credential_activation_pop_receipts
    WHERE challenge_id = ${CHALLENGE_A}
  `;
  assert.equal(receipt_count, 1);
});

test('receipt persistence failure rolls challenge consumption back', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const first = challenge({ challengeId: CHALLENGE_B });
  const second = challenge({ challengeId: CHALLENGE_A });
  await insertChallenge(first);
  await insertChallenge(second);

  const stored = await repository.commitVerifiedProof({
    receiptId: RECEIPT,
    deviceId: TAG,
    credentialVersion: 7,
    challengeId: CHALLENGE_B,
    verifiedAt: NOW.toISOString(),
  });
  assert.equal(stored?.receiptId, RECEIPT);

  await assert.rejects(
    repository.commitVerifiedProof({
      receiptId: RECEIPT,
      deviceId: TAG,
      credentialVersion: 7,
      challengeId: CHALLENGE_A,
      verifiedAt: NOW.toISOString(),
    }),
  );

  const [row] = await sql`
    SELECT consumed_at
    FROM device_pop_challenges
    WHERE challenge_id = ${CHALLENGE_A}
  `;
  assert.equal(row.consumed_at, null);
});

test('wrong purpose/device/version, expired and consumed challenges fail closed', {
  skip: !enabled,
}, async () => {
  await seedDevice();

  const telemetry = challenge({
    challengeId: CHALLENGE_A,
    purpose: 'DEVICE_DATA_TELEMETRY_INGRESS',
  });
  const expired = challenge({
    challengeId: CHALLENGE_B,
    expiresAt: NOW.toISOString(),
  });
  const consumed = challenge({
    challengeId: CHALLENGE_C,
  });

  await insertChallenge(telemetry);
  await insertChallenge(expired);
  await insertChallenge(consumed, '2026-09-30T20:29:30.000Z');

  const base = {
    receiptId: randomUUID(),
    deviceId: TAG,
    credentialVersion: 7,
    verifiedAt: NOW.toISOString(),
  };

  assert.equal(
    await repository.commitVerifiedProof({
      ...base,
      challengeId: CHALLENGE_A,
    }),
    null,
  );

  assert.equal(
    await repository.commitVerifiedProof({
      ...base,
      receiptId: randomUUID(),
      challengeId: CHALLENGE_B,
    }),
    null,
  );

  assert.equal(
    await repository.commitVerifiedProof({
      ...base,
      receiptId: randomUUID(),
      challengeId: CHALLENGE_C,
    }),
    null,
  );

  const activation = challenge({
    challengeId: 'd8030000-0000-4000-8000-000000000007',
  });
  await insertChallenge(activation);

  assert.equal(
    await repository.commitVerifiedProof({
      ...base,
      receiptId: randomUUID(),
      deviceId: 'd8030000-0000-4000-8000-000000000099',
      challengeId: activation.challengeId,
    }),
    null,
  );
  assert.equal(
    await repository.commitVerifiedProof({
      ...base,
      receiptId: randomUUID(),
      credentialVersion: 8,
      challengeId: activation.challengeId,
    }),
    null,
  );

  const [{ count }] = await sql`
    SELECT count(*)::int AS count
    FROM device_credential_activation_pop_receipts
    WHERE device_id = ${TAG}
  `;
  assert.equal(count, 0);
});
