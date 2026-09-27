import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

const platform = JSON.parse(
  await readFile(path.join(root, 'config/firmware/tag-platform-v1.json'), 'utf8'),
);
const uuidAuthority = JSON.parse(
  await readFile(path.join(root, 'config/ble/uuid-authority-v1.json'), 'utf8'),
);
const cmake = await readFile(
  path.join(root, 'firmware/collar/ncs/CMakeLists.txt'),
  'utf8',
);
const prj = await readFile(
  path.join(root, 'firmware/collar/ncs/prj.conf'),
  'utf8',
);
const ids = await readFile(
  path.join(root, 'firmware/collar/ncs/src/emopet_ble_ids.h'),
  'utf8',
);
const gatt = await readFile(
  path.join(root, 'firmware/collar/ncs/src/emopet_gatt.c'),
  'utf8',
);
const main = await readFile(
  path.join(root, 'firmware/collar/ncs/src/main.c'),
  'utf8',
);

test('TAG platform pins NCS 3.4 LTS while keeping DK and MS88SF3 authority separate', () => {
  assert.equal(platform.sdk.family, 'nRF Connect SDK');
  assert.equal(platform.sdk.version, '3.4.0');
  assert.equal(platform.sdk.releaseKind, 'LTS');
  assert.equal(
    platform.sdk.toolchainContainer,
    'ghcr.io/nrfconnect/sdk-nrf-toolchain:v3.4.0',
  );
  assert.equal(
    platform.sdk.toolchainContainerDigest,
    'sha256:f1dca44678dae83e37404e33f369786f5b2ffe2ed497eec1815f66c3a868bace',
  );
  assert.equal(
    platform.application.temporaryCompileHarnessBoard,
    'nrf52840dk/nrf52840',
  );
  assert.equal(
    platform.application.temporaryCompileHarnessIsProductionBoardAuthority,
    false,
  );
  assert.equal(platform.application.productionBoardDefinition, null);
  assert.equal(platform.evidence.ncsTargetBuild, 'NOT_YET_IN_CI');
  assert.equal(platform.evidence.targetFlash, 'NOT_RUN');
  assert.equal(platform.evidence.realBleCapture, 'NOT_RUN');
});

test('Zephyr application composes the existing canonical sensor and transport implementations', () => {
  assert.match(cmake, /find_package\(Zephyr REQUIRED/);
  assert.match(cmake, /activity_feature_summary\.c/);
  assert.match(cmake, /activity_variability\.c/);

  for (const option of [
    'CONFIG_BT=y',
    'CONFIG_BT_PERIPHERAL=y',
    'CONFIG_BT_MAX_CONN=1',
    'CONFIG_ENTROPY_GENERATOR=y',
  ]) {
    assert.ok(prj.includes(option), option);
  }
});

test('GATT scaffold binds controlled proprietary UUIDs and canonical feature serializer', () => {
  const service = uuidAuthority.active.service;
  const feature = uuidAuthority.active.featureSummary;

  assert.equal(service, 'e4e2e9a3-39c8-4140-aba9-c4e37713f59a');
  assert.equal(feature, '01141d55-a776-4091-b068-83f0804d8781');

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

test('boot/time transport provenance stays explicitly non-security and non-UTC', () => {
  assert.match(gatt, /boot_session_id = sys_rand32_get\(\)/);
  assert.match(gatt, /window_end_ms = k_uptime_get_32\(\)/);
  assert.match(gatt, /feature_sequence\+\+/);
  assert.match(gatt, /non-cryptographic/);
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

  assert.equal(platform.currentDecision, 'DO_NOT_CLAIM_REAL_TAG_BLE_DELIVERY');
});
