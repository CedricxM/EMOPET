import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  authoritySource,
  registrySource,
  migrationSource,
  manufacturingSource,
  slotsSource,
  trustSource,
  activationTypesSource,
  validatorsSource,
  activationTransactionSource,
  activationReceiptMigrationSource,
] = await Promise.all([
    readFile(new URL('../../config/security/device-credential-activation-v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../config/security/psa-key-id-registry-v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/migrations/0020_device_identity_credentials.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/security/DEVICE_IDENTITY_MANUFACTURING_PROVISIONING_2026-09-27.md', import.meta.url), 'utf8'),
    readFile(new URL('../../docs/security/DEVICE_IDENTITY_KEY_SLOTS_2026-09-27.md', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/security/device-data-trust.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../packages/shared/src/types/device-credential-activation.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../packages/shared/src/validators/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/api/security/device-credential-activation-transaction.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../backend/db/migrations/0034_device_credential_activation_receipts.sql', import.meta.url), 'utf8'),
  ]);

const authority = JSON.parse(authoritySource);
const registry = JSON.parse(registrySource);

test('#720 keeps credential activation blocked behind M4/M5 physical evidence', () => {
  assert.equal(authority.issue, 720);
  assert.match(authority.status, /M6_SERVICE_BLOCKED/);
  assert.match(authority.status, /M4_M5_TARGET_EVIDENCE_REQUIRED/);

  for (const required of [
    'FRESH_SINGLE_USE_POP_PROOF_BOUND_TO_DEVICE_AND_CREDENTIAL',
    'FINAL_DEBUG_SWD_APPROTECT_RECEIPT',
    'REPRESENTATIVE_MS88SF3_NRF52840_TARGET_EVIDENCE',
    'CREDENTIAL_VERSION_AND_DEVICE_PRINCIPAL_BINDING',
  ]) {
    assert.ok(authority.requiredEvidence.includes(required), required);
  }

  assert.equal(authority.runtime.atomicMutationPrimitiveImplemented, true);
  assert.equal(authority.runtime.activationReceiptPersistenceImplemented, true);
  assert.equal(authority.runtime.activationServiceImplemented, false);
  assert.equal(authority.runtime.rotationCutoverImplemented, false);
  assert.equal(authority.runtime.m4M5EvidenceAuthorityImplemented, false);
  assert.equal(authority.runtime.publicActivationRouteImplemented, false);
});

test('rotation contract requires one locked atomic cutover, never activate-then-revoke', () => {
  assert.equal(
    authority.activationGate.rotation,
    'LOCKED_ATOMIC_CUTOVER / OLD_ACTIVE_TO_REVOKED_PENDING_ERASE + NEW_PENDING_PROOF_TO_ACTIVE',
  );
  assert.equal(authority.activationGate.singleCutoverTimestamp, true);
  assert.equal(authority.activationGate.standaloneActivateThenRevoke, 'FORBIDDEN');

  assert.equal(registry.invariants.rotationActivationRequiresAtomicCutover, true);
  assert.equal(registry.invariants.standaloneActivateThenRevokeAllowed, false);
  assert.equal(
    registry.invariants.activationAuthority,
    'config/security/device-credential-activation-v1.json',
  );

  assert.match(manufacturingSource, /atomic cutover/i);
  assert.match(manufacturingSource, /ACTIVE -> REVOKED_PENDING_ERASE/);
  assert.match(manufacturingSource, /PENDING_PROOF -> ACTIVE/);
  assert.doesNotMatch(
    manufacturingSource,
    /backend activates new credential version;\s*\n7\. backend revokes old credential/,
  );

  assert.match(slotsSource, /atomic cutover transaction/i);
});

test('database still enforces max one ACTIVE and max one PENDING credential per device', () => {
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX uq_device_identity_credentials_one_active_per_device[\s\S]*WHERE state = 'ACTIVE'/,
  );
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX uq_device_identity_credentials_one_pending_per_device[\s\S]*WHERE state = 'PENDING_PROOF'/,
  );
  assert.equal(authority.databaseInvariants.maximumActivePerDevice, 1);
  assert.equal(authority.databaseInvariants.maximumPendingPerDevice, 1);
});

test('caller-supplied software booleans are explicitly non-authoritative', () => {
  for (const forbidden of [
    'CALLER_BOOLEAN_PROOF_PASSED',
    'CALLER_BOOLEAN_APPROTECT_VERIFIED',
    'CALLER_BOOLEAN_HARDWARE_VERIFIED',
  ]) {
    assert.ok(authority.forbiddenActivationInputs.includes(forbidden), forbidden);
  }
});

test('credential activation contract does not activate Device Data Trust or telemetry persistence', () => {
  assert.equal(authority.nonEffects.deviceDataTrustAuthorized, false);
  assert.equal(authority.nonEffects.networkTelemetryPersistenceAuthorized, false);
  assert.equal(authority.nonEffects.claimBindAuthorized, false);
  assert.equal(authority.nonEffects.revokedKeyEraseAuthorized, false);

  assert.match(trustSource, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.doesNotMatch(
    trustSource.match(/export const currentDeviceDataTrustVerifier[\s\S]*?\n\};/)?.[0] ?? '',
    /ok:\s*true/,
  );
});

test('activation evidence contract is reference-only and server-resolved', () => {
  assert.equal(
    authority.activationGate.evidenceInputPolicy,
    'SERVER_SIDE_RECEIPT_REFERENCES_ONLY / NO_PROOF_OR_APPROTECT_BOOLEAN_AUTHORITY',
  );
  assert.equal(
    authority.contracts.activationEvidenceRefs.schemaVersion,
    'device-credential-activation-evidence-refs-v1',
  );
  assert.equal(
    authority.contracts.activationReceipt.schemaVersion,
    'device-credential-activation-receipt-v1',
  );

  assert.match(activationTypesSource, /popVerificationReceiptId/);
  assert.match(activationTypesSource, /popChallengeId/);
  assert.match(activationTypesSource, /debugStateReceiptId/);
  assert.match(activationTypesSource, /targetEvidenceReceiptId/);
  assert.match(
    activationTypesSource,
    /authority: 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY'/,
  );

  assert.doesNotMatch(activationTypesSource, /proofPassed\s*:/);
  assert.doesNotMatch(activationTypesSource, /approtectVerified\s*:/);
  assert.doesNotMatch(activationTypesSource, /hardwareVerified\s*:/);

  assert.match(validatorsSource, /DeviceCredentialActivationEvidenceRefsV1Schema/);
  assert.match(validatorsSource, /DeviceCredentialActivationReceiptV1Schema/);
  assert.match(validatorsSource, /evidence credential version must match activated credential/);
  assert.match(validatorsSource, /ROTATION must retire predecessor as REVOKED_PENDING_ERASE/);
});

test('internal cutover primitive is transactional but is not M4/M5 authority', () => {
  assert.match(
    activationTransactionSource,
    /commitVerifiedDeviceCredentialActivationReceipt/,
  );
  assert.match(activationTransactionSource, /db\.transaction/);
  assert.match(activationTransactionSource, /\.for\('update'\)/);
  assert.match(activationTransactionSource, /REVOKED_PENDING_ERASE/);
  assert.match(activationTransactionSource, /PENDING_PROOF/);
  assert.match(activationTransactionSource, /deviceCredentialActivationReceipts/);
  assert.match(
    activationTransactionSource,
    /does NOT resolve or verify M4\/M5 evidence/i,
  );

  assert.doesNotMatch(activationTransactionSource, /proofPassed\s*:/);
  assert.doesNotMatch(activationTransactionSource, /approtectVerified\s*:/);
  assert.doesNotMatch(activationTransactionSource, /hardwareVerified\s*:/);
  assert.doesNotMatch(activationTransactionSource, /app\.(get|post|put|delete|patch)\(/);

  assert.match(
    activationReceiptMigrationSource,
    /CREATE TABLE device_credential_activation_receipts/,
  );
  assert.match(
    activationReceiptMigrationSource,
    /device_data_trust_authorized boolean NOT NULL/,
  );
  assert.match(
    activationReceiptMigrationSource,
    /network_telemetry_persistence_authorized boolean NOT NULL/,
  );
  assert.match(
    activationReceiptMigrationSource,
    /CHECK \([\s\S]*device_data_trust_authorized = false[\s\S]*network_telemetry_persistence_authorized = false/,
  );
});

test('future activation receipt remains non-authoritative for Device Data Trust', () => {
  assert.match(activationTypesSource, /deviceDataTrustAuthorized:\s*false/);
  assert.match(activationTypesSource, /networkTelemetryPersistenceAuthorized:\s*false/);
  assert.match(validatorsSource, /deviceDataTrustAuthorized:\s*z\.literal\(false\)/);
  assert.match(validatorsSource, /networkTelemetryPersistenceAuthorized:\s*z\.literal\(false\)/);
  assert.equal(
    authority.contracts.activationReceipt.policy,
    'FUTURE_M6_SERVER_OUTPUT_ONLY / DOES_NOT_AUTHORIZE_DEVICE_DATA_TRUST',
  );
});
