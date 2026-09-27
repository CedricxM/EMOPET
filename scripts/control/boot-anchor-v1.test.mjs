import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const authority = JSON.parse(await read('config/eli/boot-anchor-v1.json'));
const io = JSON.parse(await read('config/eli/io-first-slice.json'));
const uuidAuthority = JSON.parse(await read('config/ble/uuid-authority-v1.json'));
const ble = await read('apps/mobile/src/services/ble.ts');
const protocol = await read('packages/ble-protocol/src/clock-anchor.ts');
const gatt = await read('firmware/collar/ncs/src/emopet_gatt.c');

test('BOOT_ANCHOR_V1 has one canonical Config-characteristic protocol', () => {
  assert.equal(authority.protocol, 'BOOT_ANCHOR_V1');
  assert.equal(authority.transport.characteristicAuthority, 'BLE_CHAR_CONFIG');
  assert.equal(authority.transport.newClockCharacteristicRequired, false);
  assert.equal(authority.transport.commandId, '0x14');
  assert.equal(authority.transport.responseHeader, '0xEC');
  assert.equal(authority.transport.responseVersion, 1);
  assert.equal(authority.transport.tagUtcField, false);

  assert.equal(
    uuidAuthority.active.config,
    '8d5fa4ff-d1fa-49c3-9ce4-2e8865e4d478',
  );
  assert.match(gatt, /tag_clock_anchor_parse_request/);
  assert.match(gatt, /tag_clock_anchor_encode_response/);
});

test('mobile anchor uses monotonic RTT and fails closed on boot-session mismatch', () => {
  assert.match(ble, /captureBleBootClockAnchor/);
  assert.match(ble, /globalThis\.performance/);
  assert.match(ble, /expectedBootSessionId/);
  assert.match(ble, /CLOCK_ANCHOR_BOOT_SESSION_MISMATCH/);
  assert.match(ble, /deriveBootClockAnchorFromRoundTrip/);

  assert.match(protocol, /receiveMonotonicMs - sendMonotonicMs/);
  assert.match(protocol, /Math\.ceil\(rttMs \/ 2\) \+ timerQuantizationMs/);
  assert.doesNotMatch(protocol, /canonicalDeviceId/);

  assert.equal(authority.mobileCapture.expectedBootSessionMismatchFailsClosed, true);
  assert.equal(authority.mobileCapture.canonicalDeviceIdAttached, false);
  assert.equal(authority.mobileCapture.featureReceiveTimeShortcutAllowed, false);
  assert.equal(authority.mobileCapture.hardCodedBleLatencyConstant, false);
});

test('clock-anchor source maturity does not claim backend or target evidence', () => {
  assert.equal(io.currentTransport.clockAnchorMobileCaptureImplemented, true);
  assert.equal(io.currentTransport.productionClockAnchorImplemented, false);
  assert.equal(io.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(io.currentTransport.endToEndPath, false);

  assert.equal(authority.forwarding.canonicalDeviceBinding, 'OPEN');
  assert.equal(authority.forwarding.mobileToBackendAuthorized, false);
  assert.equal(authority.evidence.targetBuild, 'NOT_PROVEN');
  assert.equal(authority.evidence.overAir, 'NOT_PROVEN');
  assert.equal(authority.identityBoundary.physicalDeviceAuthentication, false);
});

test('a second dedicated clock-sync UUID is not part of the active authority', async () => {
  const constants = await read('packages/shared/src/constants/index.ts');
  assert.doesNotMatch(constants, /BLE_CHAR_CLOCK_SAMPLE/);
  assert.equal(
    authority.supersessionRule,
    'NO_SECOND_CLOCK_SYNC_PROTOCOL_OR_UUID_WITHOUT_EXPLICIT_AUTHORITY_CHANGE',
  );
});
