import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const authority = JSON.parse(await read('config/eli/boot-anchor-v1.json'));
const io = JSON.parse(await read('config/eli/io-first-slice.json'));
const platform = JSON.parse(await read('config/firmware/tag-platform-v1.json'));
const protocol = await read('packages/ble-protocol/src/clock-anchor.ts');
const commands = await read('packages/ble-protocol/src/commands/index.ts');
const mobile = await read('apps/mobile/src/services/ble.ts');
const wrapper = await read('apps/mobile/src/services/ble-clock-anchor.ts');
const gatt = await read('firmware/collar/ncs/src/emopet_gatt.c');

test('BOOT_ANCHOR_V1 keeps the merged Config+nonce wire authority', () => {
  assert.equal(authority.protocol, 'BOOT_ANCHOR_V1');
  assert.equal(authority.transport.requestCharacteristic, 'CONFIG');
  assert.equal(authority.transport.commandId, '0x14');
  assert.equal(authority.transport.nonceAuthority, 'CORRELATION_ONLY_NOT_SECURITY');
  assert.equal(authority.transport.tagUtcField, false);

  assert.match(commands, /CMD_REQUEST_CLOCK_ANCHOR = 0x14/);
  assert.match(commands, /buildRequestClockAnchor/);
  assert.match(protocol, /CLOCK_ANCHOR_RESPONSE_HEADER = 0xec/);
  assert.match(protocol, /requestNonce/);
  assert.match(protocol, /bootSessionId/);
  assert.match(protocol, /deviceMs/);
  assert.match(gatt, /tag_clock_anchor_parse_request/);
  assert.match(gatt, /tag_clock_anchor_encode_response/);
});

test('mobile RTT is monotonic and absolute UTC uncertainty is explicit', () => {
  assert.match(protocol, /monotonicAfterMs - monotonicBeforeMs/);
  assert.match(protocol, /wallAfterUtcMs - wallBeforeUtcMs/);
  assert.match(protocol, /WALL_CLOCK_DISCONTINUITY/);
  assert.match(protocol, /localWallClockUncertaintyMs/);
  assert.match(protocol, /wallBeforeUtcMs \+ Math\.floor\(roundTripMs \/ 2\)/);

  assert.match(mobile, /monotonicNowMs/);
  assert.match(mobile, /writeCharacteristicWithResponseForService/);
  assert.match(mobile, /monitorCharacteristicForService/);
  assert.match(mobile, /parseClockAnchorResponse/);
  assert.match(wrapper, /CLOCK_ANCHOR_NONCE_MISMATCH/);
  assert.match(wrapper, /CLOCK_SAMPLE_BOOT_MISMATCH/);

  assert.doesNotMatch(protocol, /roundTripMs = wallAfterUtcMs - wallBeforeUtcMs/);
  assert.equal(authority.mobileCapture.localWallClockUncertaintyRequired, true);
  assert.equal(authority.mobileCapture.featureReceiveTimeMayBeUsedAsAnchor, false);
});

test('source capture does not activate production or network ingestion', () => {
  assert.equal(io.currentTransport.clockAnchorMobileCaptureImplemented, true);
  assert.equal(io.currentTransport.productionClockAnchorImplemented, false);
  assert.equal(io.currentTransport.productionClockAnchorTargetEvidence, false);
  assert.equal(io.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(io.currentTransport.endToEndPath, false);

  assert.equal(platform.transport.clockAnchorMobileCaptureImplemented, true);
  assert.equal(platform.transport.productionBootAnchorV1Implemented, false);

  assert.equal(authority.evidence.targetBuild, 'NOT_YET_PROVEN');
  assert.equal(authority.evidence.overAirHandshake, 'NOT_YET_PROVEN');
  assert.equal(authority.evidence.realMobileClockUncertainty, 'NOT_YET_PROVEN');
  assert.equal(authority.forwarding.mobileToBackendAuthorized, false);
  assert.equal(authority.forwarding.networkFeatureIngestionActivated, false);
});
