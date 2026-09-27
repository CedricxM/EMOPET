import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

const [
  authoritySource,
  uuidAuthoritySource,
  ioAuthoritySource,
  manifest,
  cmake,
  prj,
  main,
  gattHeader,
  gattSource,
  readme,
] = await Promise.all([
  readFile(path.join(root, 'config/firmware/tag-ncs-platform-v1.json'), 'utf8'),
  readFile(path.join(root, 'config/ble/uuid-authority-v1.json'), 'utf8'),
  readFile(path.join(root, 'config/eli/io-first-slice.json'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/west.yml'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/app/CMakeLists.txt'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/app/prj.conf'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/app/src/main.c'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/app/src/emopet_gatt.h'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/app/src/emopet_gatt.c'), 'utf8'),
  readFile(path.join(root, 'firmware/collar/ncs/README.md'), 'utf8'),
]);

const authority = JSON.parse(authoritySource);
const uuidAuthority = JSON.parse(uuidAuthoritySource);
const io = JSON.parse(ioAuthoritySource);

test('TAG platform pins nRF Connect SDK 3.4.0 LTS and keeps the DK as compile harness only', () => {
  assert.equal(authority.sdk.family, 'nRF Connect SDK');
  assert.equal(authority.sdk.version, '3.4.0');
  assert.equal(authority.sdk.releaseClass, 'LTS');
  assert.equal(authority.sdk.manifestRevision, 'v3.4.0');
  assert.match(manifest, /revision:\s*v3\.4\.0\b/);

  assert.equal(authority.compileHarness.board, 'nrf52840dk/nrf52840');
  assert.equal(authority.compileHarness.purpose, 'COMPILE_HARNESS_ONLY');
  assert.equal(authority.compileHarness.productionBoardAuthority, false);
  assert.equal(authority.compileHarness.buildVerifiedInRepositoryCI, false);

  assert.equal(authority.productionTarget.module, 'MS88SF3');
  assert.equal(authority.productionTarget.soc, 'nRF52840');
  assert.equal(authority.productionTarget.boardDefinition, 'OPEN');
  assert.match(readme, /DK build is \*\*not\*\* production-board evidence/);
});

test('Zephyr app reuses the canonical sensor and feature-summary implementation', () => {
  assert.match(cmake, /activity_variability\.c/);
  assert.match(cmake, /activity_feature_summary\.c/);
  assert.match(prj, /^CONFIG_BT=y$/m);
  assert.match(prj, /^CONFIG_BT_PERIPHERAL=y$/m);
  assert.match(main, /bt_enable\(NULL\)/);
  assert.match(main, /bt_le_adv_start/);

  assert.match(gattSource, /BT_GATT_SERVICE_DEFINE/);
  assert.ok((gattSource.match(/BT_GATT_CHRC_NOTIFY/g) ?? []).length >= 2);
  assert.match(gattSource, /tag_feature_summary_encode_activity_variability/);
  assert.match(gattSource, /bt_gatt_notify/);
  assert.doesNotMatch(gattSource, /memcpy\([^\n]*feature.*frame/i);
});

test('GATT UUID macros encode the current proprietary UUID authority exactly', () => {
  const expected = [
    uuidAuthority.active.service,
    uuidAuthority.active.sensorFrame,
    uuidAuthority.active.featureSummary,
  ];

  for (const uuid of expected) {
    const [w32, w1, w2, w3, w48] = uuid.split('-');
    for (const part of [w32, w1, w2, w3, w48]) {
      assert.ok(
        gattHeader.toLowerCase().includes(`0x${part.toLowerCase()}`),
        `missing UUID component ${part} for ${uuid}`,
      );
    }
  }

  const activeSource = [main, gattHeader, gattSource, prj, cmake].join('\n');
  assert.doesNotMatch(
    activeSource,
    /0000ea0[1-5]-0000-1000-8000-00805f9b34fb/i,
  );
});

test('platform maturity remains fail-honest until target build and hardware evidence exist', () => {
  assert.equal(authority.gatt.serviceSourceImplemented, true);
  assert.equal(authority.gatt.featureSummaryNotifySourceImplemented, true);
  assert.equal(
    authority.gatt.featureSummarySerializer,
    'tag_feature_summary_encode_activity_variability',
  );
  assert.equal(authority.gatt.targetBuildVerified, false);
  assert.equal(authority.gatt.targetFlashed, false);
  assert.equal(authority.gatt.notificationCapturedOverAir, false);

  assert.equal(io.currentTransport.peripheralGattSourceCandidateImplemented, true);
  assert.equal(io.currentTransport.peripheralGattCharacteristicImplemented, false);
  assert.equal(io.currentTransport.peripheralGattTargetBuildVerified, false);
  assert.equal(io.currentTransport.peripheralGattHardwareFlashed, false);
  assert.equal(io.currentTransport.endToEndPath, false);
  assert.equal(io.currentDecision, 'DO_NOT_CLAIM_REAL_TAG_BLE_DELIVERY');
});

test('TAG peripheral source contains no latent ELI semantics or Device Trust shortcut', () => {
  const source = [main, gattHeader, gattSource].join('\n');
  assert.doesNotMatch(source, /stepEKF|eliStates|arousal|valence|wellbeing|behavio[u]?ral interpretation/i);
  assert.doesNotMatch(source, /authenticated device|trusted device|proof.of.possession/i);
});
