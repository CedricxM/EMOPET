import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) =>
  readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('TAG G1 pins a reproducible NCS LTS workspace and DK compile harness', async () => {
  const [authoritySource, manifest, cmake, prj, main, doc] = await Promise.all([
    read('config/firmware/tag-platform-authority-v1.json'),
    read('firmware/collar/zephyr/west.yml'),
    read('firmware/collar/zephyr/CMakeLists.txt'),
    read('firmware/collar/zephyr/prj.conf'),
    read('firmware/collar/zephyr/src/main.c'),
    read('docs/control/TAG_FW_PLATFORM_G1_BOOTSTRAP_2026-09-27.md'),
  ]);

  const authority = JSON.parse(authoritySource);

  assert.equal(authority.issue, 625);
  assert.equal(authority.ncs.revision, 'v3.4.1');
  assert.equal(authority.compileHarness.board, 'nrf52840dk/nrf52840');
  assert.equal(authority.compileHarness.productionBoardAuthority, false);
  assert.equal(authority.productionTarget.module, 'Minew MS88SF3');
  assert.equal(authority.productionTarget.boardDefinitionImplemented, false);
  assert.equal(authority.bluetooth.stackInitializationImplemented, true);
  assert.equal(authority.bluetooth.gattServiceImplemented, false);
  assert.equal(authority.bluetooth.notificationImplemented, false);
  assert.equal(
    authority.currentDecision,
    'DO_NOT_CLAIM_MS88SF3_TARGET_BUILD_OR_LIVE_GATT',
  );

  assert.match(manifest, /revision:\s*v3\.4\.1/);
  assert.match(manifest, /name:\s*nrf/);
  assert.match(cmake, /find_package\(Zephyr REQUIRED/);
  assert.match(cmake, /src\/main\.c/);
  assert.match(prj, /CONFIG_BT=y/);
  assert.match(prj, /CONFIG_BT_PERIPHERAL=y/);
  assert.match(main, /bt_enable\(NULL\)/);

  // G1 must not smuggle in later gates.
  for (const source of [main, cmake, prj]) {
    assert.doesNotMatch(source, /bt_gatt_service_define|BT_GATT_SERVICE_DEFINE|bt_gatt_notify/);
    assert.doesNotMatch(source, /0000EA0[1-5]/i);
  }

  assert.match(doc, /compile harness only/i);
  assert.match(doc, /not the EMOPET production board/i);
  assert.match(doc, /DO_NOT_CLAIM_MS88SF3_TARGET_BUILD_OR_LIVE_GATT/);
});
