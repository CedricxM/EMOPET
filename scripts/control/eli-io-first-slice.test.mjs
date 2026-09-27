import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('activity_variability has a canonical firmware writer while live delivery remains explicit', async () => {
  const feature = await readFile(new URL('../../packages/shared/src/types/feature-vector.ts', import.meta.url), 'utf8');
  const frames = await readFile(new URL('../../packages/ble-protocol/src/frames/types.ts', import.meta.url), 'utf8');
  const writer = await readFile(new URL('../../firmware/collar/main/transport/activity_feature_summary.c', import.meta.url), 'utf8');
  const authority = JSON.parse(await readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8'));

  assert.ok(feature.includes('activity_variability: number | null'));

  // BLE V1 TAG SensorFrame remains unchanged. The feature uses a separate,
  // versioned feature-summary frame rather than silently extending TAG V1.
  assert.equal(/activityVariability\s*:/.test(frames), false);
  assert.equal(/activity_variability\s*:/.test(frames), false);
  assert.equal(authority.currentTransport.tagPayloadContainsActivityVariability, false);

  assert.equal(authority.currentTransport.firmwareWriterImplemented, true);
  assert.equal(authority.currentTransport.featureSummaryTransportVersion, 1);
  assert.equal(authority.currentTransport.featureSummaryFrameSizeBytes, 27);
  assert.match(writer, /FEATURE_SUMMARY_HEADER 0xEBu/);
  assert.match(writer, /TAG_FEATURE_SUMMARY_FRAME_SIZE/);

  // The mobile central is now implemented, but the peripheral and network
  // continuation must remain explicit gaps.
  assert.equal(authority.currentTransport.mobileBleNativePluginConfigured, true);
  assert.equal(authority.currentTransport.mobileBleSubscriptionImplemented, true);
  assert.equal(authority.currentTransport.peripheralGattCharacteristicImplemented, false);
  assert.equal(authority.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(authority.currentTransport.clockAnchorWireContractImplemented, true);
  assert.equal(authority.currentTransport.clockAnchorPeripheralResponseImplemented, true);
  assert.equal(authority.currentTransport.clockAnchorMobileCaptureImplemented, true);
  assert.equal(authority.currentTransport.clockAnchorLocalWallClockUncertaintyRequired, true);
  assert.equal(authority.currentTransport.clockAnchorReceiveTimeShortcutAllowed, false);
  assert.equal(authority.currentTransport.productionClockAnchorImplemented, false);
  assert.equal(authority.currentTransport.productionClockAnchorTargetEvidence, false);
  assert.equal(authority.currentTransport.networkFeatureIngestionActivated, false);
  assert.equal(authority.currentTransport.featureEnvelopeIngestionImplemented, false);
  assert.equal(authority.currentTransport.endToEndPath, false);

  // #621 exposes the persisted physical observation only, not latent ELI.
  assert.equal(authority.backendPersistenceBoundary.publicRoute, true);
  assert.equal(authority.backendPersistenceBoundary.ownerProjection, true);
  assert.equal(authority.backendPersistenceBoundary.eliInvocation, false);
  assert.equal(authority.backendPersistenceBoundary.ownerProjectionAuthority, 'PHYSICAL_MOVEMENT_VARIABILITY_ONLY');
  assert.equal(authority.currentDecision, 'DO_NOT_CLAIM_END_TO_END_DELIVERY');
});

test('first slice assigns one computation owner without authorizing duplicate recompute', async () => {
  const authority = JSON.parse(await readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8'));
  assert.equal(authority.producer.owner, 'TAG_FIRMWARE');
  assert.equal(authority.candidateOwnership.featureComputation, 'FIRMWARE');
  assert.equal(authority.candidateOwnership.mobileRole, 'TRANSPORT_ONLY');
  assert.equal(authority.candidateOwnership.duplicateIndependentRecompute, 'PROHIBITED_UNLESS_SEPARATELY_AUTHORIZED');
});


test('forwarding candidate gate exists without selecting policy or network authority', async () => {
  const authority = JSON.parse(
    await readFile(new URL('../../config/eli/io-first-slice.json', import.meta.url), 'utf8'),
  );
  const source = await readFile(
    new URL('../../packages/ble-protocol/src/feature-forwarding.ts', import.meta.url),
    'utf8',
  );

  assert.equal(authority.currentTransport.featureForwardingCandidateGateImplemented, true);
  assert.equal(
    authority.currentTransport.featureForwardingCandidateAuthority,
    'packages/ble-protocol/src/feature-forwarding.ts',
  );
  assert.equal(authority.currentTransport.forwardingRequiresCanonicalDeviceId, true);
  assert.equal(authority.currentTransport.forwardingAcceptsBleTransportIdAsCanonicalIdentity, false);
  assert.equal(authority.currentTransport.forwardingAnchorFreshnessPolicyRequired, true);
  assert.equal(authority.currentTransport.forwardingAnchorUncertaintyPolicyRequired, true);
  assert.equal(authority.currentTransport.forwardingPolicyValuesSelected, false);
  assert.equal(authority.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(authority.currentTransport.networkFeatureIngestionActivated, false);
  assert.equal(authority.currentTransport.endToEndPath, false);

  assert.match(source, /canonicalDeviceId/);
  assert.match(source, /maxAnchorAgeMs/);
  assert.match(source, /maxAnchorUncertaintyMs/);
  assert.match(source, /BOOT_SESSION_MISMATCH/);
  assert.doesNotMatch(source, /bleDeviceId/);
});
