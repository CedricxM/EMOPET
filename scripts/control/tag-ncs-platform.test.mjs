import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

const [
  platformSource,
  uuidAuthoritySource,
  ioSource,
  manifest,
  cmake,
  prj,
  ids,
  gattHeader,
  gatt,
  main,
  readme,
] = await Promise.all([
  readFile(path.join(root, 'config/firmware/tag-platform-v1.json'), 'utf8'),
  readFile(path.join(root, 'config/ble/uuid-authority-v1.json'), 'utf8'),
  readFile(path.join(root, 'config/eli/io-first-slice.json'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/west.yml'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/CMakeLists.txt'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/prj.conf'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/src/emopet_ble_ids.h'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/src/emopet_gatt.h'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/src/emopet_gatt.c'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/src/main.c'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/README.md'), 'utf8'),
]);

const platform = JSON.parse(platformSource);
const uuidAuthority = JSON.parse(uuidAuthoritySource);
const io = JSON.parse(ioSource);

test('one canonical TAG platform pins NCS 3.4.0 LTS and keeps DK/MS88SF3 authority separate', () => {
  assert.equal(platform.sdk.family, 'nRF Connect SDK');
  assert.equal(platform.sdk.version, '3.4.0');
  assert.equal(platform.sdk.releaseKind, 'LTS');
  assert.equal(platform.sdk.manifestRevision, 'v3.4.0');
  assert.match(manifest, /revision:\s*v3\.4\.0\b/);

  assert.equal(
    platform.application.temporaryCompileHarnessBoard,
    'nrf52840dk/nrf52840',
  );
  assert.equal(
    platform.application.temporaryCompileHarnessIsProductionBoardAuthority,
    false,
  );
  assert.equal(platform.application.productionBoardDefinition, null);
  assert.equal(platform.application.productionBoardStatus, 'OPEN');

  assert.equal(platform.evidence.ncsTargetBuild, 'NOT_YET_IN_CI');
  assert.equal(platform.evidence.targetFlash, 'NOT_RUN');
  assert.equal(platform.evidence.realBleCapture, 'NOT_RUN');

  assert.match(readme, /DK build would prove source\/API\/toolchain coherence only/);
  assert.match(readme, /must not be cited as the EMOPET production board/i);
});

test('canonical NCS app composes existing sensor + serializer and controlled proprietary GATT', () => {
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

  assert.match(main, /emopet_gatt_init\(\)/);
  assert.match(main, /emopet_gatt_start_advertising\(\)/);
  assert.match(main, /No synthetic feature emission here/);

  assert.match(gatt, /BT_GATT_SERVICE_DEFINE/);
  assert.ok((gatt.match(/BT_GATT_CHRC_NOTIFY/g) ?? []).length >= 2);
  assert.match(gatt, /tag_feature_summary_encode_activity_variability/);
  assert.match(gatt, /bt_gatt_notify_uuid/);

  for (const uuid of [
    uuidAuthority.active.service,
    uuidAuthority.active.sensorFrame,
    uuidAuthority.active.featureSummary,
  ]) {
    const [w32, w1, w2, w3, w48] = uuid.split('-');
    for (const part of [w32, w1, w2, w3, w48]) {
      assert.ok(ids.toLowerCase().includes(`0x${part.toLowerCase()}`), uuid);
    }
  }
});

test('GATT does not invent boot/session/window provenance or equate send time with measurement time', () => {
  assert.match(
    gattHeader,
    /caller owns boot_session_id, sequence and the real monotonic window end/i,
  );
  assert.match(
    gattHeader,
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
  assert.equal(platform.transport.utcWallClockOnTag, false);
});

test('source candidate and real peripheral delivery stay separate in #122 authority', () => {
  assert.equal(io.currentTransport.peripheralGattSourceCandidateImplemented, true);
  assert.equal(io.currentTransport.peripheralGattCharacteristicImplemented, false);
  assert.equal(io.currentTransport.peripheralGattTargetBuildVerified, false);
  assert.equal(io.currentTransport.peripheralGattHardwareFlashed, false);
  assert.equal(
    io.currentTransport.peripheralGattDecision,
    'DO_NOT_CLAIM_REAL_TAG_BLE_DELIVERY',
  );
  assert.equal(io.currentTransport.endToEndPath, false);
  assert.equal(io.currentDecision, 'DO_NOT_CLAIM_END_TO_END_DELIVERY');
});

test('merged #627 duplicate platform authority is removed from active main surfaces', async () => {
  for (const retired of [
    'config/firmware/tag-platform-authority-v1.json',
    'firmware/collar/zephyr/west.yml',
    'scripts/control/tag-fw-platform-g1.test.mjs',
  ]) {
    await assert.rejects(
      access(path.join(root, retired)),
      (error) => error && error.code === 'ENOENT',
      retired,
    );
  }
});

test('TAG peripheral source contains no latent ELI semantics or physical-trust shortcut', () => {
  const source = [main, gattHeader, gatt, ids].join('\n');
  assert.doesNotMatch(source, /stepEKF|eliStates|arousal|valence|wellbeing/i);
  assert.doesNotMatch(source, /authenticated device|trusted device|proof.of.possession/i);
  assert.doesNotMatch(source, /0000ea0[1-5]-0000-1000-8000-00805f9b34fb/i);
});
