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
] = await Promise.all([
  readFile(new URL('../../config/security/device-pop-challenge-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-identity-pop-evaluation-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-trust-authority.json', import.meta.url), 'utf8'),
  readFile(new URL('../../packages/shared/src/validators/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../packages/shared/src/types/device-pop.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-data-trust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-pop-challenge-issuer.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-pop-verifier.ts', import.meta.url), 'utf8'),
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
  for (const state of [
    'replayStore',
    'credentialRepository',
    'deviceDataTrust',
  ]) {
    assert.equal(contract.runtime[state], 'NOT_IMPLEMENTED', state);
  }
  assert.equal(
    contract.runtime.backendVerifier,
    'SOURCE_PRIMITIVE_IMPLEMENTED / INJECTED_AUTHORITIES_REQUIRED / NO_HTTP_ROUTE',
  );
  assert.equal(contract.runtime.verifierHasDefaultStore, false);
  assert.equal(contract.runtime.verifierHasPublicRoute, false);
  assert.equal(contract.runtime.verifierAuthorizesDeviceDataTrust, false);
  assert.equal(contract.runtime.verifierAuthorizesTelemetryPersistence, false);
  assert.equal(
    contract.runtime.challengePersistence,
    'NOT_IMPLEMENTED / MIGRATION_SLOT_BLOCKED_BY_PARALLEL_0020',
  );
  assert.equal(contract.runtime.issuerHasDefaultTtl, false);
  assert.equal(contract.runtime.issuerHasDefaultStore, false);
  assert.equal(contract.runtime.issuerHasPublicRoute, false);
  assert.equal(contract.runtime.networkTelemetryPersistence, 'BLOCKED');
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
      /device-pop-(?:challenge-issuer|verifier)|issueDevicePopChallengeV1|verifyDevicePopResponseV1/,
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
  assert.equal(contract.runtime.devicePrivateKeyProvisioning, 'NOT_IMPLEMENTED');
  assert.match(contract.runtime.devicePrivateKeyStorage, /NOT_IMPLEMENTED/);
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
