import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./tag-source-coherence.mjs', import.meta.url);

function run({ sch, erc, pcb }) {
  const dir = mkdtempSync(join(tmpdir(), 'tag-source-coherence-'));
  const schPath = join(dir, 'x.kicad_sch');
  const ercPath = join(dir, 'ERC.rpt');
  writeFileSync(schPath, sch);
  writeFileSync(ercPath, erc);
  const args = [script.pathname, '--schematic', schPath, '--erc', ercPath];
  if (pcb != null) {
    const pcbPath = join(dir, 'x.kicad_pcb');
    writeFileSync(pcbPath, pcb);
    args.push('--pcb', pcbPath);
  }
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

test('passes when every ERC-referenced placed ref exists in schematic', () => {
  const r = run({
    sch: '(symbol (property "Reference" "U2"))\n(symbol (property "Reference" "U10"))',
    erc: 'Symbol U2 Pin 1 [X]\nSymbol U10 Pin 4 [CE]',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PASS/);
});

test('fails closed when ERC references a symbol absent from schematic', () => {
  const r = run({
    sch: '(symbol (property "Reference" "U2"))',
    erc: 'Symbol U2 Pin 1 [X]\nSymbol U10 Pin 4 [CE]\nSymbol BR1 Pin 1 [AC1]',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /BR1, U10|U10, BR1/);
  assert.match(r.stderr, /mixed-version or incomplete/);
});

test('PCB-only differences are reported but do not define ERC coherence', () => {
  const r = run({
    sch: '(symbol (property "Reference" "U2"))',
    erc: 'Symbol U2 Pin 1 [X]',
    pcb: '(footprint (property "Reference" "U2"))\n(footprint (property "Reference" "BR1"))',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /PCB contains refs absent from schematic: BR1/);
});
