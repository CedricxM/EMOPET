import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ids = [
  'A01','A02','A03','A04','A05','A06',
  'R01','R02','R03','R04','R05','R06','R07',
  'G01','G02','G03','G04','G05',
  'S01','S02','S03','S04','S05',
];

test('all 23 Guardian proxies have explicit machine-readable evidence status', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  assert.deepEqual(Object.keys(map.proxies).sort(), ids.sort());
  for (const id of ids) {
    assert.ok(map.proxies[id].claimStatus);
    assert.notEqual(map.proxies[id].claimStatus, 'SUPPORTED');
    assert.equal(map.proxies[id].validationEvidence, null);
  }
});

test('Guardian proxy modal does not render a bare validation-looking reference label', async () => {
  const url = new URL('../../apps/web/components/eli/ProxyChartModal.tsx', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.equal(source.includes('Référence : {proxy.reference}'), false);
  assert.ok(source.includes('Source de contexte (ne valide pas ce proxy)'));
});

test('scientific footer disclaims blanket proxy validation', async () => {
  const url = new URL('../../apps/web/lib/eli/catalog.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('Ces sources ne constituent pas une validation proxy par proxy'));
});


test('G02 remains behind the dedicated respiratory-variability gate', async () => {
  const url = new URL('../../config/science/eli-proxy-evidence.json', import.meta.url);
  const map = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(map.proxies.G02.claimStatus, 'SEPARATE_GATE');
  assert.match(map.proxies.G02.note, /#86/);
  assert.equal(map.proxies.G02.validationEvidence, null);
});
