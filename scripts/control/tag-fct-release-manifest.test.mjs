import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = async (rel) =>
  JSON.parse(await readFile(path.join(root, rel), 'utf8'));

const manifest = await readJson(
  'config/industrial/tag-fct-release-manifest-v1.json',
);

const requiredCompatibility = [
  'pcbRevision',
  'bomRevision',
  'firmwareCommit',
  'firmwareBuildHash',
  'testScriptRevision',
  'limitsRevision',
  'testPointMapRevision',
  'fixtureInterfaceRevision',
];

const expectedReleaseGates = [
  'CONTROLLED_PCB_REVISION_BOUND',
  'CONTROLLED_BOM_REVISION_BOUND',
  'NATIVE_DRC_RECEIPT_BOUND',
  'PHYSICAL_TEST_POINTS_BOUND',
  'FIRMWARE_TEST_IMAGE_BOUND',
  'DETERMINISTIC_TEST_COMMANDS_BOUND',
  'LIMITS_REVIEWED',
  'OPERATOR_SOP_RELEASED',
];

test('TAG FCT manifest remains fail-closed while release inputs are incomplete', () => {
  const unresolved = requiredCompatibility.filter(
    (key) => manifest.compatibility[key] == null,
  );

  if (unresolved.length > 0) {
    assert.equal(manifest.status, 'PREPARED_NOT_RELEASED');
    assert.equal(manifest.authorityBoundaries.fixtureDesignRelease, false);
    assert.equal(manifest.authorityBoundaries.fixturePurchaseAuthority, false);
    assert.equal(manifest.authorityBoundaries.fabricationAuthority, false);
    assert.equal(manifest.authorityBoundaries.productionRelease, false);
    assert.equal(manifest.authorityBoundaries.deviceTrustAuthorized, false);
  }
});

test('TAG FCT manifest carries every mandatory release gate exactly once', () => {
  assert.deepEqual(
    [...manifest.requiredBeforeRelease].sort(),
    [...expectedReleaseGates].sort(),
  );
  assert.equal(new Set(manifest.requiredBeforeRelease).size, expectedReleaseGates.length);
});

test('draft revisions cannot silently become fixture or fabrication authority', () => {
  const draftBindings = Object.entries(manifest.compatibility)
    .filter(([, value]) => typeof value === 'string' && /draft/i.test(value))
    .map(([key]) => key);

  if (draftBindings.length > 0) {
    assert.equal(manifest.authorityBoundaries.fixtureDesignRelease, false);
    assert.equal(manifest.authorityBoundaries.fabricationAuthority, false);
    assert.equal(manifest.authorityBoundaries.productionRelease, false);
  }
});

test('release state requires complete compatibility binding and no draft revisions', () => {
  if (manifest.status === 'RELEASED') {
    for (const key of requiredCompatibility) {
      assert.equal(typeof manifest.compatibility[key], 'string', key);
      assert.ok(manifest.compatibility[key].trim().length > 0, key);
      assert.doesNotMatch(manifest.compatibility[key], /draft|candidate|tbd/i, key);
    }
    assert.equal(manifest.authorityBoundaries.fixtureDesignRelease, true);
  }
});

test('FCT release never grants purchase, fabrication, production or device-trust authority', () => {
  assert.equal(manifest.authorityBoundaries.fixturePurchaseAuthority, false);
  assert.equal(manifest.authorityBoundaries.fabricationAuthority, false);
  assert.equal(manifest.authorityBoundaries.productionRelease, false);
  assert.equal(manifest.authorityBoundaries.deviceTrustAuthorized, false);
});
