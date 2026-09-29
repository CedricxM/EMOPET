import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const [threatSource, provisioningSource, evaluationSource, trustSource] =
  await Promise.all([
    read('config/security/device-identity-threat-model-v1.json'),
    read('docs/security/DEVICE_IDENTITY_MANUFACTURING_PROVISIONING_2026-09-27.md'),
    read('config/security/device-identity-pop-evaluation-v1.json'),
    read('config/security/device-trust-authority.json'),
  ]);

const threat = JSON.parse(threatSource);
const evaluation = JSON.parse(evaluationSource);
const trust = JSON.parse(trustSource);

test('P0 device identity threat model keeps identifiers non-authoritative', () => {
  for (const required of [
    'FICR_DEVICEID',
    'BLE_MAC',
    'BLE_RUNTIME_ID',
    'CRC',
    'BOOT_SESSION_ID',
    'TRANSPORT_SEQUENCE',
    'BACKEND_DEVICE_ROW_BY_ITSELF',
  ]) {
    assert.ok(threat.nonAuthorities.includes(required), required);
  }

  assert.equal(threat.p0AttackBoundary.remoteReplay, 'MUST_RESIST');
  assert.equal(threat.p0AttackBoundary.maliciousMobileFabrication, 'MUST_RESIST');
  assert.equal(
    threat.p0AttackBoundary.ordinarySwdMemoryReadout,
    'MUST_RESIST_WITH_PRODUCTION_DEBUG_POLICY',
  );
});

test('manufacturing flow cannot activate trust without challenge proof and final debug state', () => {
  for (const stage of [
    'M2_CREATE_CRYPTO_AUTHORITY',
    'M3_BACKEND_ENROLLMENT_PENDING',
    'M4_FRESH_CHALLENGE_PROOF',
    'M5_FINAL_DEBUG_SWD_STATE',
    'M6_ACTIVATE_CREDENTIAL',
  ]) {
    assert.ok(threat.manufacturingStages.includes(stage), stage);
  }

  assert.match(provisioningSource, /state = `PENDING_PROOF`/);
  assert.match(provisioningSource, /atomic cutover/i);
  assert.match(provisioningSource, /PENDING_PROOF -> ACTIVE/);
  assert.match(provisioningSource, /ACTIVE -> REVOKED_PENDING_ERASE/);
  assert.match(provisioningSource, /APPROTECT/);
  assert.match(provisioningSource, /No raw device root\/private key belongs in the receipt/);
});

test('threat/provisioning evidence is delivered and selected architecture stays non-activating', () => {
  assert.equal(evaluation.evidenceState.threatModel.status, 'DELIVERED');
  assert.equal(
    evaluation.evidenceState.commonManufacturingProvisioning.status,
    'DELIVERED_AS_ARCHITECTURE_NEUTRAL_FLOW',
  );

  assert.equal(evaluation.selection.architecture, 'B_DEVICE_SPECIFIC_ASYMMETRIC_POP');
  assert.equal(evaluation.selection.algorithmFamily, 'ECDSA_SHA256');
  assert.equal(evaluation.selection.keySizeOrCurve, 'SECP256R1_256');
  assert.equal(
    evaluation.selection.challengeFormat,
    'DEVICE_POP_CHALLENGE_V1 / FIXED_BINARY_SHA256 / ECDSA_P256_P1363_64',
  );
  assert.equal(
    evaluation.evidenceState.challengeResponseContract,
    'DELIVERED_AS_VERSIONED_DATA_CONTRACT / RUNTIME_OPEN',
  );

  assert.equal(threat.selection.architecture, 'B_DEVICE_SPECIFIC_ASYMMETRIC_POP');
  assert.equal(threat.selection.algorithmFamily, 'ECDSA_SHA256');
  assert.equal(threat.selection.curve, 'SECP256R1_256');

  assert.equal(evaluation.runtime.deviceDataTrust, 'NOT_IMPLEMENTED');
  assert.equal(evaluation.runtime.networkTelemetryPersistence, 'BLOCKED');
  assert.equal(trust.telemetryIngestion.runtime, 'NOT_IMPLEMENTED');
});

test('debug/RMA authority cannot preserve trust by public identifier alone', () => {
  assert.equal(threat.productionDebugPolicy.approtectRequiredDecision, true);
  assert.equal(threat.productionDebugPolicy.receiptRequired, true);
  assert.equal(
    threat.productionDebugPolicy.rmaMustNotPreserveTrustByIdentifierOnly,
    true,
  );
});
