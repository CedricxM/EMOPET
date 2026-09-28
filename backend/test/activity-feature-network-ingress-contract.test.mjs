import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [routes, authority, trust, config] = await Promise.all([
  readFile(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/services/activity-feature-network-authority.ts', import.meta.url), 'utf8'),
  readFile(new URL('../api/security/device-data-trust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../config/security/device-trust-authority.json', import.meta.url), 'utf8'),
]);

test('feature network route is present but cannot reach persistence', () => {
  assert.match(routes, /\/features\/activity-variability/);
  assert.match(routes, /ActivityFeatureForwardingCandidateV1Schema/);
  assert.match(routes, /authorizeActivityFeatureNetworkIngress/);
  assert.match(routes, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.match(routes, /FEATURE_NETWORK_INGESTION_NOT_ACTIVATED/);

  assert.doesNotMatch(routes, /ingestActivityVariabilityTransportFrame/);
  assert.doesNotMatch(routes, /persistActivityVariabilityFeatureObservation/);
  assert.doesNotMatch(routes, /sensorFeatureObservations/);
});

test('server ingress authority rechecks canonical registry binding before trust verifier', () => {
  assert.match(authority, /eq\(devices\.id, candidate\.deviceId\)/);
  assert.match(authority, /eq\(devices\.dogId, candidate\.dogId\)/);
  assert.match(authority, /eq\(devices\.type, 'TAG'\)/);
  assert.match(authority, /dog\.ownerId !== ownerId/);
  assert.match(authority, /verifier\.verify/);
  assert.match(authority, /trust\.principalId !== device\.id/);
});

test('default telemetry Device Trust authority remains fail closed', () => {
  const cfg = JSON.parse(config);
  assert.equal(cfg.telemetryIngestion.canonicalDevicePrincipalBinding, 'REQUIRED');
  assert.equal(cfg.telemetryIngestion.ownerDogBinding, 'SERVER_RECHECK_REQUIRED');
  assert.equal(
    cfg.telemetryIngestion.physicalDeviceAuthentication,
    'ASYMMETRIC_POP_REQUIRED / RUNTIME_NOT_IMPLEMENTED',
  );
  assert.equal(cfg.telemetryIngestion.deviceIdentityArchitectureGate, 648);
  assert.equal(
    cfg.devicePrincipal.identityArchitectureSelection,
    'B_DEVICE_SPECIFIC_ASYMMETRIC_POP / ECDSA_SHA256_SECP256R1 / TARGET_PROOF_REQUIRED',
  );
  assert.equal(
    cfg.claimBinding.proofOfPossessionArchitecture,
    'ECDSA_SHA256_SECP256R1 / PUBLIC_KEY_VERIFICATION / RUNTIME_NOT_IMPLEMENTED',
  );
  assert.equal(cfg.telemetryIngestion.transportReplayEvidenceIsAuthentication, false);
  assert.equal(cfg.telemetryIngestion.bleTransportIdentifierIsPrincipal, false);
  assert.equal(cfg.telemetryIngestion.runtime, 'NOT_IMPLEMENTED');

  assert.match(trust, /DEVICE_DATA_TRUST_RUNTIME_NOT_IMPLEMENTED/);
  assert.doesNotMatch(trust, /return \{\s*ok: true/);
});
