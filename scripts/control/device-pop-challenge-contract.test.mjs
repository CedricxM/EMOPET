import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  contractSource,
  evaluationSource,
  trustSource,
  validatorsSource,
  typesSource,
  ingressSource,
  issuerSource,
  verifierSource,
  challengeRepositorySource,
  challengeMigrationSource,
  credentialRepositorySource,
  keyProvisionerSource,
] = await Promise.all([
  readFile(new URL('../../config/security/device-pop-challenge-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-identity-pop-evaluation-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-trust-authority.json', import.meta.url), 'utf8'),
  readFile(new URL('../../packages/shared/src/validators/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../packages/shared/src/types/device-pop.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-data-trust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-pop-challenge-issuer.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-pop-verifier.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-pop-challenge-repository.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/db/migrations/0026_device_pop_challenges.sql', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-credential-repository.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../firmware/collar/ncs/src/device_identity_key_provisioner_psa.c', import.meta.url), 'utf8'),
]);

const contract = JSON.parse(contractSource);
const evaluation = JSON.parse(evaluationSource);
const trust = JSON.parse(trustSource);

test('PoP v1 signs a fixed domain-separated binary contract rather than JSON', () => {
  assert.equal(contract.issue, 648);
  assert.equal(contract.architecture.proof, 'ECDSA_SHA256_SECP256R1');
  assert.equal(contract.signingPreimage.name, 'EMOPET_DEVICE_POP_FIXED_BINARY_V1');
  assert.equal(contract.signingPreimage.domainSeparatorAscii, 'EMOPET_DEVICE_POP_V1');
  assert.equal(contract.signingPreimage.hash, 'SHA256');
  assert.equal(contract.signingPreimage.integerEndian, 'BIG_ENDIAN');
  assert.equal(contract.signingPreimage.jsonSerializationIsSigningAuthority, false);

  assert.deepEqual(contract.signingPreimage.fieldsInOrder, [
    'DOMAIN_SEPARATOR_ASCII',
    'PROTOCOL_VERSION_U8',
    'PURPOSE_CODE_U8',
    'DEVICE_PRINCIPAL_UUID_16',
    'CREDENTIAL_VERSION_U32',
    'CHALLENGE_ID_UUID_16',
    'NONCE_32',
    'ISSUED_AT_UNIX_MS_U64',
    'EXPIRES_AT_UNIX_MS_U64',
  ]);
});

test('initial proof purpose is telemetry-only and cannot silently authorize another domain', () => {
  assert.equal(contract.challenge.purpose.initialAllowed, 'DEVICE_DATA_TELEMETRY_INGRESS');
  assert.equal(contract.challenge.purpose.code, 1);
  assert.equal(contract.challenge.purpose.reuseForClaimBindOrCommands, false);

  assert.match(typesSource, /DEVICE_DATA_TELEMETRY_INGRESS/);
  assert.match(validatorsSource, /DevicePopPurposeV1Schema/);
  assert.doesNotMatch(typesSource, /CLAIM_BIND|TRUSTED_COMMAND|OTA_INSTALL/);
});

test('challenge entropy, signature encoding and public verifier authority are exact', () => {
  assert.equal(contract.challenge.challengeId.bytes, 16);
  assert.equal(contract.challenge.nonce.bytes, 32);
  assert.equal(contract.challenge.ttlValue, 'OPEN_POLICY / NO_DEFAULT_IN_CONTRACT');

  assert.equal(contract.response.signatureEncoding, 'IEEE_P1363_RAW_R_32_PLUS_S_32');
  assert.equal(contract.response.signatureBytes, 64);
  assert.equal(contract.response.derEncodingAccepted, false);
  assert.equal(contract.response.publicKeyIncludedInResponse, false);

  assert.equal(
    contract.backendVerification.publicKeySource,
    'ACTIVE_ENROLLED_CREDENTIAL_FOR_CANONICAL_DEVICE_PRINCIPAL_AND_VERSION',
  );
  assert.equal(contract.architecture.publicKeyEnrollment, 'SEC1_UNCOMPRESSED_P256_65_BYTES');
});

test('replay and expiry remain server-owned and fail closed', () => {
  assert.equal(contract.backendVerification.deviceClockTrustedForExpiry, false);
  assert.equal(contract.backendVerification.serverTimeOwnsExpiry, true);
  assert.equal(contract.backendVerification.responseFieldsMustMatchStoredChallenge, true);
  assert.equal(contract.backendVerification.successfulVerificationConsumesChallengeAtomically, true);
  assert.equal(contract.backendVerification.consumedChallengeReplayRejected, true);
  assert.equal(contract.backendVerification.expiredChallengeRejected, true);
  assert.equal(contract.backendVerification.revokedOrReplacedCredentialRejected, true);
  assert.equal(contract.backendVerification.invalidSignatureAuthorizesNothing, true);

  assert.equal(
    contract.runtime.challengeIssuer,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_AUTHORITIES_REQUIRED / NO_HTTP_ROUTE',
  );
  assert.equal(
    contract.runtime.deviceSigner,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_OPAQUE_PSA_KEY_ID / NO_KEY_GENERATION_OR_STORAGE',
  );
  assert.match(contract.runtime.replayStore, /DURABLE_POSTGRES_IMPLEMENTED/);
  assert.match(contract.runtime.credentialRepository, /DURABLE_POSTGRES_IMPLEMENTED/);
  assert.match(contract.runtime.credentialRepository, /PENDING_PROOF_ENROLLMENT/);
  assert.match(contract.runtime.credentialRepository, /ACTIVE_READ_ONLY_RESOLVER/);
  assert.match(contract.runtime.credentialRepository, /NO_ACTIVATION_MUTATION/);
  assert.equal(contract.runtime.deviceDataTrust, 'NOT_IMPLEMENTED');
  assert.equal(
    contract.runtime.backendVerifier,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_AUTHORITIES_REQUIRED / NO_HTTP_ROUTE',
  );
  assert.equal(contract.runtime.verifierHasDefaultStore, false);
  assert.equal(contract.runtime.verifierHasPublicRoute, false);
  assert.equal(contract.runtime.verifierAuthorizesDeviceDataTrust, false);
  assert.equal(contract.runtime.verifierAuthorizesTelemetryPersistence, false);
  assert.match(contract.runtime.challengePersistence, /DURABLE_POSTGRES_IMPLEMENTED/);
  assert.match(contract.runtime.challengePersistence, /MIGRATION_0026/);
  assert.match(contract.runtime.challengePersistence, /HISTORICAL\+GENERATED_DB_PROOF_GREEN/);
  assert.match(contract.runtime.challengePersistence, /NO_DEFAULT_TTL/);
  assert.match(contract.runtime.challengePersistence, /NO_CLEANUP_POLICY/);
  assert.equal(contract.runtime.issuerHasDefaultTtl, false);
  assert.equal(contract.runtime.issuerHasDefaultStore, false);
  assert.equal(contract.runtime.issuerHasPublicRoute, false);
  assert.equal(contract.runtime.networkTelemetryPersistence, 'BLOCKED');
});

test('durable replay store implements both injected interfaces without creating runtime authority', () => {
  assert.match(challengeRepositorySource, /durableDevicePopChallengeRepository/);
  assert.match(challengeRepositorySource, /DevicePopChallengeStore\s*&\s*DevicePopVerificationChallengeStore/);
  assert.match(challengeRepositorySource, /onConflictDoNothing/);
  assert.match(challengeRepositorySource, /consumeIfUnconsumed/);
  assert.match(challengeRepositorySource, /isNull\(devicePopChallenges\.consumedAt\)/);
  assert.match(challengeRepositorySource, /lte\(devicePopChallenges\.issuedAt, consumedAtDate\)/);
  assert.match(challengeRepositorySource, /gt\(devicePopChallenges\.expiresAt, consumedAtDate\)/);
  assert.doesNotMatch(challengeRepositorySource, /app\.(get|post|put|delete|patch)\(/);

  assert.match(challengeMigrationSource, /CREATE TABLE device_pop_challenges/);
  assert.match(challengeMigrationSource, /device_pop_challenges_device_id_devices_id_fk/);
  assert.match(challengeMigrationSource, /CHECK \(expires_at > issued_at\)/);
  assert.match(challengeMigrationSource, /consumed_at IS NULL/);
  assert.doesNotMatch(challengeMigrationSource, /signature|private_key|public_key/i);

  assert.equal(contract.runtime.issuerHasDefaultStore, false);
  assert.equal(contract.runtime.verifierHasDefaultStore, false);
  assert.equal(contract.runtime.verifierHasPublicRoute, false);
  assert.equal(contract.runtime.verifierAuthorizesDeviceDataTrust, false);
  assert.equal(contract.runtime.verifierAuthorizesTelemetryPersistence, false);
});

test('durable credential repository is delivered but cannot activate trust', () => {
  assert.equal(
    contract.runtime.credentialRepositorySource,
    'backend/api/security/device-credential-repository.ts',
  );
  assert.equal(
    contract.runtime.credentialRepositoryIntegrationTest,
    'backend/test/device-credential-repository.integration.test.mjs',
  );

  assert.match(credentialRepositorySource, /enrollPendingDeviceIdentityCredential/);
  assert.match(credentialRepositorySource, /state:\s*'PENDING_PROOF'/);
  assert.match(credentialRepositorySource, /durableDevicePopCredentialRepository/);
  assert.match(credentialRepositorySource, /eq\(deviceIdentityCredentials\.state, 'ACTIVE'\)/);
  assert.doesNotMatch(
    credentialRepositorySource,
    /set\(\{[^}]*state:\s*'ACTIVE'/s,
  );

  assert.match(
    evaluation.evidenceState.backendEnrollmentModel,
    /DURABLE_POSTGRES_IMPLEMENTED/,
  );
  assert.match(
    evaluation.evidenceState.publicEnrollmentReceipt,
    /DURABLE_PERSISTENCE_IMPLEMENTED/,
  );
  assert.match(
    evaluation.evidenceState.publicEnrollmentReceipt,
    /PENDING_PROOF_ONLY/,
  );
});

test('device key provisioning source exists but remains default-off and target-unproven', () => {
  assert.match(
    contract.runtime.devicePrivateKeyProvisioning,
    /SOURCE_PRIMITIVE_IMPLEMENTED/,
  );
  assert.match(
    contract.runtime.devicePrivateKeyProvisioning,
    /DEFAULT_OFF_KCONFIG/,
  );
  assert.match(
    contract.runtime.devicePrivateKeyProvisioning,
    /TARGET_HUK_SECURE_STORAGE_PROOF_OPEN/,
  );
  assert.match(
    contract.runtime.devicePrivateKeyStorage,
    /PRODUCTION_STORAGE_NOT_PROVEN/,
  );

  assert.match(keyProvisionerSource, /device_identity_key_provision_p256_v1/);
  assert.match(keyProvisionerSource, /PSA_KEY_LIFETIME_PERSISTENT/);
  assert.match(keyProvisionerSource, /device_identity_key_id_is_reserved_slot/);
  assert.match(keyProvisionerSource, /psa_export_public_key/);
  assert.doesNotMatch(keyProvisionerSource, /psa_export_key\s*\(/);

  assert.match(
    evaluation.evidenceState.devicePrivateKeyProvisioning,
    /SOURCE_IMPLEMENTED_BEHIND_DEFAULT_OFF_KCONFIG/,
  );
  assert.match(
    evaluation.evidenceState.devicePrivateKeyProvisioning,
    /HUK_SECURE_STORAGE_TARGET_PROOF_OPEN/,
  );
});

test('shared boundary validates challenge/response shape without implementing verification', () => {
  assert.match(typesSource, /device-pop-challenge-v1/);
  assert.match(typesSource, /ECDSA_P256_SHA256_P1363_64/);
  assert.match(validatorsSource, /nonce:\s*Base64UrlNoPaddingSchema\.length\(43\)/);
  assert.match(validatorsSource, /signature:\s*Base64UrlNoPaddingSchema\.length\(86\)/);
  assert.match(validatorsSource, /expiresAt must be strictly after issuedAt/);
  assert.doesNotMatch(typesSource, /verifySignature|crypto\.subtle|createVerify/);
});

test('#648 and main Device Trust authority point at PoP v1 while runtime stays blocked', () => {
  assert.equal(
    evaluation.selection.challengeFormat,
    'DEVICE_POP_CHALLENGE_V1 / FIXED_BINARY_SHA256 / ECDSA_P256_P1363_64',
  );
  assert.equal(evaluation.challengeContractAuthority, 'config/security/device-pop-challenge-v1.json');
  assert.match(evaluation.evidenceState.challengeResponseContract, /DELIVERED/);

  assert.equal(trust.claimBinding.proofOfPossessionContract, 'config/security/device-pop-challenge-v1.json');
  assert.match(trust.claimBinding.challengeContract, /RUNTIME_NOT_IMPLEMENTED/);
  assert.match(trust.telemetryIngestion.proofOfPossessionContract, /RUNTIME_NOT_IMPLEMENTED/);
  assert.equal(trust.telemetryIngestion.runtime, 'NOT_IMPLEMENTED');

  assert.match(ingressSource, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.doesNotMatch(
    ingressSource.match(/currentDeviceDataTrustVerifier[\s\S]*?\n\};/)?.[0] ?? '',
    /ok:\s*true/,
  );
});


test('issuer primitive requires injected credential + atomic store authority and is not routed', async () => {
  assert.match(issuerSource, /issueDevicePopChallengeV1/);
  assert.match(issuerSource, /credentials:\s*DevicePopCredentialResolver/);
  assert.match(issuerSource, /store:\s*DevicePopChallengeStore/);
  assert.match(issuerSource, /createIfAbsent/);
  assert.match(issuerSource, /ACTIVE_CREDENTIAL_NOT_FOUND/);
  assert.match(issuerSource, /CHALLENGE_ID_CONFLICT/);
  assert.match(issuerSource, /CHALLENGE_STORE_FAILURE/);
  assert.match(issuerSource, /expiresAt:\s*Date/);
  assert.doesNotMatch(issuerSource, /ttlMs\s*[:=]\s*\d+/);
  assert.doesNotMatch(issuerSource, /persistActivityVariabilityFeatureObservation/);

  const { readdir } = await import('node:fs/promises');
  const routeDir = new URL('../../backend/api/routes/', import.meta.url);
  const routeFiles = (await readdir(routeDir)).filter((name) => name.endsWith('.ts'));
  const routeSources = await Promise.all(
    routeFiles.map((name) => readFile(new URL(name, routeDir), 'utf8')),
  );
  for (const routeSource of routeSources) {
    assert.doesNotMatch(routeSource, /device-pop-challenge-issuer|issueDevicePopChallengeV1/);
  }
});


test('verifier primitive reconstructs server challenge state and cannot activate trust', async () => {
  assert.match(verifierSource, /verifyDevicePopResponseV1/);
  assert.match(verifierSource, /buildDevicePopSigningPreimageV1/);
  assert.match(verifierSource, /createPublicKey/);
  assert.match(verifierSource, /dsaEncoding:\s*'ieee-p1363'/);
  assert.match(verifierSource, /findByChallengeId/);
  assert.match(verifierSource, /consumeIfUnconsumed/);
  assert.match(verifierSource, /CHALLENGE_ALREADY_CONSUMED/);
  assert.match(verifierSource, /CHALLENGE_EXPIRED/);
  assert.match(verifierSource, /INVALID_SIGNATURE/);
  assert.match(verifierSource, /CHALLENGE_CONSUME_CONFLICT/);
  assert.match(verifierSource, /deviceDataTrustAuthorized:\s*false/);
  assert.match(verifierSource, /telemetryPersistenceAuthorized:\s*false/);
  assert.doesNotMatch(verifierSource, /persistActivityVariabilityFeatureObservation/);

  const { readdir } = await import('node:fs/promises');
  const routeDir = new URL('../../backend/api/routes/', import.meta.url);
  const routeFiles = (await readdir(routeDir)).filter((name) => name.endsWith('.ts'));
  const routeSources = await Promise.all(
    routeFiles.map((name) => readFile(new URL(name, routeDir), 'utf8')),
  );
  for (const routeSource of routeSources) {
    assert.doesNotMatch(
      routeSource,
      /device-pop-(?:challenge-issuer|verifier|challenge-repository)|issueDevicePopChallengeV1|verifyDevicePopResponseV1/,
    );
  }
});


test('device-side preimage stays serialization-only while signer source remains storage-separated', async () => {
  const preimageSource = await readFile(
    new URL('../../firmware/collar/main/security/device_pop_preimage.c', import.meta.url),
    'utf8',
  );
  const preimageHeader = await readFile(
    new URL('../../firmware/collar/main/security/device_pop_preimage.h', import.meta.url),
    'utf8',
  );

  assert.equal(
    contract.runtime.devicePreimageBuilder,
    'SOURCE_IMPLEMENTED / C_BACKEND_BYTE_PARITY_GATED / NO_PRIVATE_KEY_ACCESS',
  );
  assert.equal(
    contract.runtime.deviceSigner,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_OPAQUE_PSA_KEY_ID / NO_KEY_GENERATION_OR_STORAGE',
  );
  assert.equal(contract.runtime.deviceSignerTargetBuildVerified, false);
  assert.match(contract.runtime.devicePrivateKeyProvisioning, /SOURCE_PRIMITIVE_IMPLEMENTED/);
  assert.match(contract.runtime.devicePrivateKeyProvisioning, /TARGET_HUK_SECURE_STORAGE_PROOF_OPEN/);
  assert.match(contract.runtime.devicePrivateKeyStorage, /PRODUCTION_STORAGE_NOT_PROVEN/);
  assert.match(preimageHeader, /DEVICE_POP_PREIMAGE_V1_SIZE\s+106u/);
  assert.match(preimageSource, /EMOPET_DEVICE_POP_V1/);
  assert.match(preimageSource, /write_u32_be/);
  assert.match(preimageSource, /write_u64_be/);
  const executablePreimageSource = (preimageSource + preimageHeader)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(
    executablePreimageSource,
    /psa_|mbedtls_|PSA_KEY_|psa_key_id_t|private.?key|ECDSA/i,
  );
});
