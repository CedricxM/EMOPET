import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [evaluationSource, trustSource, ingressSource, masterSource] = await Promise.all([
  readFile(new URL('../../config/security/device-identity-pop-evaluation-v1.json', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-trust-authority.json', import.meta.url), 'utf8'),
  readFile(new URL('../../backend/api/security/device-data-trust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/security/DEVICE_TRUST_MASTER_2026-09-25.md', import.meta.url), 'utf8'),
]);

const evaluation = JSON.parse(evaluationSource);
const trust = JSON.parse(trustSource);

test('#648 selects exactly one P0 asymmetric architecture while runtime remains blocked', () => {
  assert.equal(
    evaluation.status,
    'P0_ARCHITECTURE_SELECTED / ASYMMETRIC_POP / TARGET_PROOF_REQUIRED / DEVICE_DATA_TRUST_RUNTIME_BLOCKED',
  );
  assert.equal(evaluation.issue, 648);
  assert.equal(evaluation.parentIssue, 66);

  assert.equal(evaluation.selection.architecture, 'B_DEVICE_SPECIFIC_ASYMMETRIC_POP');
  assert.equal(evaluation.selection.algorithmFamily, 'ECDSA_SHA256');
  assert.equal(evaluation.selection.keySizeOrCurve, 'SECP256R1_256');
  assert.equal(
    evaluation.selection.credentialProvisioningFlow,
    'ON_DEVICE_KEY_GENERATION / PUBLIC_KEY_ENROLLMENT / FRESH_CHALLENGE_PROOF / APPROTECT_BEFORE_ACTIVE',
  );
  assert.equal(
    evaluation.selection.backendEnrollmentSchema,
    'PUBLIC_KEY_PER_CANONICAL_DEVICE_PRINCIPAL_AND_CREDENTIAL_VERSION',
  );
  assert.equal(
    evaluation.selection.debugSwdProductionPolicy,
    'APPROTECT_REQUIRED_BEFORE_CREDENTIAL_ACTIVE',
  );
  assert.equal(
    evaluation.selection.challengeFormat,
    'DEVICE_POP_CHALLENGE_V1 / FIXED_BINARY_SHA256 / ECDSA_P256_P1363_64',
  );
  assert.equal(
    evaluation.challengeContractAuthority,
    'config/security/device-pop-challenge-v1.json',
  );
  assert.equal(evaluation.selection.rotationRevocationPolicy, null);

  assert.match(evaluation.candidates.A_HUK_KDR_DERIVED_SYMMETRIC_POP.state, /NOT_SELECTED/);
  assert.match(evaluation.candidates.B_DEVICE_SPECIFIC_ASYMMETRIC_POP.state, /SELECTED_FOR_P0/);
  assert.match(evaluation.candidates.C_EXTERNAL_SECURE_ELEMENT.state, /ESCALATION_ONLY/);
});

test('nRF52840 hardware constraints are explicit and do not inflate identifiers into authentication', () => {
  assert.equal(evaluation.verifiedHardwareFacts.cryptoPeripheral, 'Arm CryptoCell CC310');
  assert.equal(evaluation.verifiedHardwareFacts.kmuPresent, false);
  assert.equal(evaluation.verifiedHardwareFacts.supportedHukType, 'KDR_ONLY');
  assert.equal(evaluation.verifiedHardwareFacts.hukRole, 'KEY_DERIVATION_ROOT_ONLY');
  assert.equal(
    evaluation.verifiedHardwareFacts.ficrDeviceIdRole,
    'PUBLIC_IDENTIFIER_ONLY / NOT_AUTHENTICATOR',
  );
  assert.equal(
    evaluation.verifiedHardwareFacts.bleAddressRole,
    'TRANSPORT_IDENTIFIER_ONLY / NOT_AUTHENTICATOR',
  );

  for (const forbiddenAuthority of [
    'BLE_RUNTIME_DEVICE_ID',
    'BLE_MAC_ADDRESS',
    'FICR_DEVICEID',
    'BACKEND_DEVICES_ID_BY_ITSELF',
    'BOOT_SESSION_ID',
    'TRANSPORT_SEQUENCE',
    'CRC_VALID_FRAME',
  ]) {
    assert.ok(evaluation.nonAuthorities.includes(forbiddenAuthority), forbiddenAuthority);
  }
});

test('main Device Trust authority delegates identity selection to #648 while keeping runtime blocked', () => {
  assert.equal(trust.devicePrincipal.identityArchitectureGate, 648);
  assert.equal(
    trust.devicePrincipal.identityArchitectureAuthority,
    'config/security/device-identity-pop-evaluation-v1.json',
  );
  assert.equal(
    trust.devicePrincipal.identityArchitectureSelection,
    'B_DEVICE_SPECIFIC_ASYMMETRIC_POP / ECDSA_SHA256_SECP256R1 / TARGET_PROOF_REQUIRED',
  );
  assert.equal(
    trust.devicePrincipal.ficrDeviceIdAuthority,
    'IDENTIFIER_ONLY / NOT_AUTHENTICATOR',
  );
  assert.equal(
    trust.claimBinding.proofOfPossessionArchitecture,
    'ECDSA_SHA256_SECP256R1 / PUBLIC_KEY_VERIFICATION / RUNTIME_NOT_IMPLEMENTED',
  );
  assert.equal(trust.telemetryIngestion.deviceIdentityArchitectureGate, 648);
  assert.equal(trust.telemetryIngestion.runtime, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.deviceDataTrust, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.networkTelemetryPersistence, 'BLOCKED');
});

test('backend Device Data Trust hard stop remains executable until #648 closes', () => {
  assert.match(ingressSource, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.match(
    ingressSource,
    /currentDeviceDataTrustVerifier[\s\S]*async verify\(\)[\s\S]*return \{[\s\S]*ok:\s*false,[\s\S]*error:\s*DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/,
  );

  const runtimeBlock = ingressSource.match(
    /export const currentDeviceDataTrustVerifier[\s\S]*?\n\};/,
  )?.[0] ?? '';
  assert.ok(runtimeBlock.length > 0);
  assert.doesNotMatch(runtimeBlock, /ok:\s*true/);
});

test('Device Trust master points manufacturing identity to #648', () => {
  assert.match(masterSource, /Current P0 architecture gate:\*\* #648/);
  assert.match(masterSource, /device-identity-pop-evaluation-v1\.json/);
  assert.match(masterSource, /device-specific asymmetric proof of possession/i);
  assert.match(masterSource, /ECDSA\/SHA-256/);
  assert.match(masterSource, /secp256r1 \(P-256\)/);
});
