import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

const platform = JSON.parse(await read('config/firmware/tag-platform-v1.json'));
const uuidAuthority = JSON.parse(await read('config/ble/uuid-authority-v1.json'));
const manifest = await read('firmware/collar/ncs/west.yml');
const readme = await read('firmware/collar/ncs/README.md');
const cmake = await read('firmware/collar/ncs/CMakeLists.txt');
const prj = await read('firmware/collar/ncs/prj.conf');
const ids = await read('firmware/collar/ncs/src/emopet_ble_ids.h');
const gatt = await read('firmware/collar/ncs/src/emopet_gatt.c');
const main = await read('firmware/collar/ncs/src/main.c');

test('TAG platform has one canonical NCS v3.4.0 LTS authority', async () => {
  assert.equal(platform.sdk.family, 'nRF Connect SDK');
  assert.equal(platform.sdk.series, '3.4.x LTS');
  assert.equal(platform.sdk.version, '3.4.0');
  assert.equal(platform.sdk.revision, 'v3.4.0');
  assert.equal(platform.sdk.sourceManifest, 'firmware/collar/ncs/west.yml');
  assert.equal(platform.application.path, 'firmware/collar/ncs');
  assert.equal(platform.application.westManifest, 'firmware/collar/ncs/west.yml');
  assert.equal(
    platform.application.temporaryCompileHarnessBoard,
    'nrf52840dk/nrf52840',
  );
  assert.equal(
    platform.application.temporaryCompileHarnessIsProductionBoardAuthority,
    false,
  );
  assert.equal(platform.application.productionBoardDefinition, null);

  assert.match(manifest, /revision:\s*v3\.4\.0/);
  assert.match(readme, /single canonical target-firmware runtime/i);
  assert.match(readme, /v3\.4\.0 LTS/);

  // An unverified container receipt must not masquerade as current toolchain evidence.
  assert.equal(platform.sdk.toolchainContainer, null);
  assert.equal(platform.sdk.toolchainContainerDigest, null);
  assert.equal(platform.sdk.toolchainReceiptStatus, 'NOT_YET_CAPTURED_FOR_3.4.0');

  for (const retired of [
    'firmware/collar/zephyr',
    'config/firmware/tag-platform-authority-v1.json',
    'scripts/control/tag-fw-platform-g1.test.mjs',
  ]) {
    await assert.rejects(access(path.join(root, retired)));
  }
});

test('canonical NCS application composes the existing sensor and transport implementations', () => {
  assert.match(cmake, /find_package\(Zephyr REQUIRED/);
  assert.match(cmake, /activity_feature_summary\.c/);
  assert.match(cmake, /activity_variability\.c/);

  for (const option of [
    'CONFIG_BT=y',
    'CONFIG_BT_PERIPHERAL=y',
    'CONFIG_BT_MAX_CONN=1',
  ]) {
    assert.ok(prj.includes(option), option);
  }
  assert.equal(prj.includes('CONFIG_ENTROPY_GENERATOR=y'), false);
});

test('GATT scaffold binds controlled proprietary UUIDs and canonical feature serializer', () => {
  assert.equal(
    uuidAuthority.active.service,
    'e4e2e9a3-39c8-4140-aba9-c4e37713f59a',
  );
  assert.equal(
    uuidAuthority.active.featureSummary,
    '01141d55-a776-4091-b068-83f0804d8781',
  );

  for (const token of [
    'BT_UUID_128_ENCODE(0xe4e2e9a3, 0x39c8, 0x4140, 0xaba9, 0xc4e37713f59a)',
    'BT_UUID_128_ENCODE(0x01141d55, 0xa776, 0x4091, 0xb068, 0x83f0804d8781)',
  ]) {
    assert.ok(ids.includes(token), token);
  }

  assert.doesNotMatch(ids, /0000ea0[1-5]/i);
  assert.match(gatt, /BT_GATT_SERVICE_DEFINE/);
  assert.match(gatt, /BT_GATT_CHARACTERISTIC/);
  assert.match(gatt, /BT_GATT_CCC/);
  assert.match(gatt, /bt_gatt_notify_uuid/);
  assert.match(gatt, /tag_feature_summary_encode_activity_variability/);
});

test('transport provenance remains caller-owned and send time cannot replace measurement time', async () => {
  const header = await read('firmware/collar/ncs/src/emopet_gatt.h');

  assert.match(
    header,
    /caller owns boot_session_id, sequence and the real monotonic window end/i,
  );
  assert.match(
    header,
    /const tag_activity_feature_summary_input_t \*input/,
  );
  assert.match(gatt, /tag_feature_summary_encode_activity_variability\(\s*input,/);
  assert.doesNotMatch(gatt, /sys_rand32_get|k_uptime_get_32|feature_sequence\+\+/);

  assert.equal(
    platform.transport.bootSessionSource,
    'CALLER_OWNED / OPEN_PRODUCTION_POLICY',
  );
  assert.equal(
    platform.transport.sequenceSource,
    'CALLER_OWNED / OPEN_PRODUCTION_POLICY',
  );
  assert.equal(
    platform.transport.windowEndMsSource,
    'CALLER_OWNED_MONOTONIC_WINDOW_END',
  );
  assert.equal(platform.transport.sendTimeMayReplaceWindowEndMs, false);
  assert.equal(platform.transport.bootSessionIsSecurityIdentity, false);
  assert.equal(platform.transport.utcWallClockOnTag, false);
  assert.equal(platform.ble.physicalDeviceAuthentication, false);
});

test('entrypoint advertises but cannot fabricate a physical observation', () => {
  assert.match(main, /emopet_gatt_init\(\)/);
  assert.match(main, /emopet_gatt_start_advertising\(\)/);
  assert.match(main, /No synthetic feature emission here/);

  const executableLines = main
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('*'));

  assert.equal(
    executableLines.some((line) =>
      /^emopet_gatt_publish_activity_variability\s*\(/.test(line)
    ),
    false,
  );

  assert.equal(
    platform.currentDecision,
    'DO_NOT_CLAIM_REAL_TAG_BLE_DELIVERY_OR_MS88SF3_TARGET_BUILD',
  );
});
