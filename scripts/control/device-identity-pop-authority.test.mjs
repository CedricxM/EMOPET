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

test('#648 remains evaluation-only with no implicit crypto selection', () => {
  assert.equal(
    evaluation.status,
    'EVALUATION_ONLY / NO_ARCHITECTURE_SELECTED / DEVICE_DATA_TRUST_RUNTIME_BLOCKED',
  );
  assert.equal(evaluation.issue, 648);
  assert.equal(evaluation.parentIssue, 66);

  for (const field of [
    'architecture',
    'algorithmFamily',
    'keySizeOrCurve',
    'challengeFormat',
    'credentialProvisioningFlow',
    'backendEnrollmentSchema',
    'rotationRevocationPolicy',
    'debugSwdProductionPolicy',
  ]) {
    assert.equal(evaluation.selection[field], null, field);
  }

  for (const candidate of Object.values(evaluation.candidates)) {
    assert.equal(candidate.state, 'EVALUATE');
  }
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
  assert.equal(trust.devicePrincipal.identityArchitectureSelection, 'OPEN');
  assert.equal(
    trust.devicePrincipal.ficrDeviceIdAuthority,
    'IDENTIFIER_ONLY / NOT_AUTHENTICATOR',
  );
  assert.equal(trust.claimBinding.proofOfPossessionArchitecture, 'OPEN_UNDER_648');
  assert.equal(trust.telemetryIngestion.deviceIdentityArchitectureGate, 648);
  assert.equal(trust.telemetryIngestion.runtime, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.deviceDataTrust, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.networkTelemetryPersistence, 'BLOCKED');
});

test('backend Device Data Trust hard stop remains executable until #648 closes', () => {
  assert.match(ingressSource, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.match(ingressSource, /trusted:\s*false/);
  assert.doesNotMatch(ingressSource, /trusted:\s*true/);
});

test('Device Trust master points manufacturing identity to #648', () => {
  assert.match(masterSource, /Current P0 architecture gate:\*\* #648/);
  assert.match(masterSource, /device-identity-pop-evaluation-v1\.json/);
  assert.match(masterSource, /No architecture or algorithm is selected yet/);
});
