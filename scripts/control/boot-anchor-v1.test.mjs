import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const authority = JSON.parse(await read('config/eli/boot-anchor-v1.json'));
const io = JSON.parse(await read('config/eli/io-first-slice.json'));
const constants = await read('packages/shared/src/constants/index.ts');
const hostCodec = await read('packages/ble-protocol/src/device-clock-sample.ts');
const firmwareCodec = await read('firmware/collar/main/transport/device_clock_sample.c');
const gatt = await read('firmware/collar/ncs/src/emopet_gatt.c');
const ids = await read('firmware/collar/ncs/src/emopet_ble_ids.h');
const mobile = await read('apps/mobile/src/services/ble.ts');
const mobileAnchor = await read('apps/mobile/src/services/ble-clock-anchor.ts');

test('BOOT_ANCHOR_V1 owns a proprietary read-only device clock sample', () => {
  assert.equal(authority.protocol, 'BOOT_ANCHOR_V1');
  assert.equal(authority.gatt.frameSizeBytes, 11);
  assert.equal(authority.gatt.header, 0xec);
  assert.equal(authority.gatt.version, 1);
  assert.equal(authority.gatt.tagUtcField, false);
  assert.equal(
    authority.gatt.characteristic,
    '7c2c7cc8-91a8-58c1-a38a-2f9b9929f5d5',
  );

  assert.match(constants, /BLE_CHAR_CLOCK_SAMPLE/);
  assert.match(ids, /BT_UUID_EMOPET_CLOCK_SAMPLE_VAL/);
  assert.match(gatt, /BT_GATT_CHRC_READ/);
  assert.match(gatt, /read_clock_sample/);
  assert.match(gatt, /tag_device_clock_sample_encode/);
});

test('clock sample carries boot session + monotonic time only', () => {
  assert.match(hostCodec, /bootSessionId/);
  assert.match(hostCodec, /deviceMs/);
  assert.match(firmwareCodec, /boot_session_id/);
  assert.match(firmwareCodec, /device_ms/);
  assert.doesNotMatch(hostCodec, /anchorUtc|Date\.now|receivedAt/);
  assert.doesNotMatch(firmwareCodec, /utc|epoch|wall.clock/i);
  assert.match(gatt, /k_uptime_get_32\(\)/);
});

test('mobile capture uses midpoint and explicit uncertainty, not feature receive time', () => {
  assert.match(mobile, /readCharacteristicForService/);
  assert.match(mobile, /BLE_CHAR_CLOCK_SAMPLE/);
  assert.match(mobile, /captureDeviceBootClockAnchor/);
  assert.match(mobileAnchor, /beforeUtcMs \+ Math\.floor\(roundTripMs \/ 2\)/);
  assert.match(mobileAnchor, /Math\.ceil\(roundTripMs \/ 2\) \+ 2/);
  assert.match(mobileAnchor, /CLOCK_SAMPLE_BOOT_MISMATCH/);
  assert.match(mobileAnchor, /CLOCK_SAMPLE_RTT_TOO_HIGH/);
  assert.doesNotMatch(mobileAnchor, /new Date\(afterUtcMs\)/);
  assert.equal(authority.mobileCapture.featureReceiveTimeMayBeUsedAsAnchor, false);
  assert.equal(io.currentTransport.receiveTimeShortcutAllowed, false);
});

test('feature publish still preserves producer-owned measurement-window end', () => {
  const publishStart = gatt.indexOf('int emopet_gatt_publish_activity_variability');
  assert.ok(publishStart >= 0);
  const publishSource = gatt.slice(publishStart);

  assert.match(publishSource, /uint32_t window_end_ms/);
  assert.match(publishSource, /\.window_end_ms = window_end_ms/);
  assert.doesNotMatch(publishSource, /k_uptime_get_32\(\)/);
});

test('source delivery does not claim target or network maturity', () => {
  assert.equal(authority.evidence.targetBuild, 'NOT_YET_PROVEN');
  assert.equal(authority.evidence.overAirRead, 'NOT_YET_PROVEN');
  assert.equal(authority.forwarding.mobileToBackendAuthorized, false);
  assert.equal(io.currentTransport.productionClockAnchorImplemented, false);
  assert.equal(io.currentTransport.productionClockAnchorTargetEvidence, false);
  assert.equal(io.currentTransport.mobileToBackendForwardingImplemented, false);
  assert.equal(io.currentTransport.endToEndPath, false);
});
