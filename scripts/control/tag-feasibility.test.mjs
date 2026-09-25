import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('TAG combined feasibility remains physically open and routing is held', async () => {
  const url = new URL('../../config/hardware/tag-feasibility.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(cfg.status, 'PHYSICAL_GATE_OPEN');
  assert.equal(cfg.routingFreeze, 'HOLD');
  assert.notEqual(cfg.domains.pdn, 'VALIDATED');
  assert.notEqual(cfg.domains.lteRf, 'VALIDATED');
  assert.notEqual(cfg.domains.acoustic, 'VALIDATED');
  assert.notEqual(cfg.domains.wearability, 'VALIDATED');
});

test('feasibility record preserves measured-evidence boundary', async () => {
  const url = new URL('../../docs/hardware/tag/TAG_COMBINED_PHYSICAL_FEASIBILITY_2026-09-25.md', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('TAG_ROUTING_FREEZE = HOLD'));
  assert.ok(source.includes('TAG_PHYSICAL_FEASIBILITY = NOT VALIDATED'));
  assert.ok(source.includes('Do not collapse conducted PASS into antenna PASS'));
  assert.ok(source.includes('raw logs/data'));
});
