import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('TAG external partner register remains RFQ-only with no selection', async () => {
  const url = new URL('../../config/industrial/tag-external-partner-rfq.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(cfg.status, 'RFQ_REQUIRED_NO_PROVIDER_SELECTED');
  assert.equal(cfg.selection, null);
  assert.equal(cfg.purchaseAuthority, false);
  assert.equal(cfg.fabricationRelease, false);
});

test('MOKO boundary keeps TAG design ownership outside factory role', async () => {
  const url = new URL('../../config/industrial/tag-external-partner-rfq.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(cfg.mokoBoundary.pcbaFabricationAssembly, true);
  assert.equal(cfg.mokoBoundary.repeatableFunctionalTestExecution, true);
  assert.equal(cfg.mokoBoundary.tagDesignClosureOwner, false);
  assert.equal(cfg.mokoBoundary.rfMechanicalPowerEngineeringOwner, false);
});

test('RFQ package requires evidence handover and exact lab scope', async () => {
  const url = new URL('../../docs/industrial/tag_labs/TAG_PHASE0_EXTERNAL_TEST_PARTNER_RFQ_2026-09-25.md', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('editable fixture CAD/source'));
  assert.ok(source.includes('raw or minimally processed data'));
  assert.ok(source.includes('exact accreditation scope'));
  assert.ok(source.includes('no long-term lock-in'));
});
