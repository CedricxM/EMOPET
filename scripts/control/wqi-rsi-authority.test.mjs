import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('WQI/RSI checked-in authority remains prototype-only', async () => {
  const url = new URL('../../config/science/wqi-rsi-authority.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));
  assert.equal(cfg.status, 'PROTOTYPE_ONLY / NOT_AUTHORIZED_FOR_PRODUCTION');
  assert.equal(cfg.wqi.runtimeAuthority, 'NONE');
  assert.equal(cfg.rsi.runtimeAuthority, 'NONE');
  assert.equal(cfg.wqi.scientificValidation, 'NOT_PERFORMED');
  assert.equal(cfg.rsi.scientificValidation, 'NOT_PERFORMED');
  assert.equal(cfg.phantomReferences['ELI v6 §7'], 'NOT_RECOVERED_AS_CONTROLLED_AUTHORITY');
  assert.equal(cfg.phantomReferences['ELI v6 §8'], 'NOT_RECOVERED_AS_CONTROLLED_AUTHORITY');
});

test('web dashboard does not present phantom ELI v6 section authority', async () => {
  const url = new URL('../../apps/web/app/dashboard/BienEtreSection.tsx', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.equal(source.includes('ELI v6 §7'), false);
  assert.equal(source.includes('définitions fidèles au modèle'), false);
  assert.ok(source.includes('Pondérations prototype, non validées pour la production'));
  assert.ok(source.includes('score simulé, seuils non validés pour la production'));
});

test('mock source explicitly denies Product authority', async () => {
  const url = new URL('../../apps/web/lib/eli/mock.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('PROTOTYPE / DEMO ONLY (#91)'));
  assert.ok(source.includes('NOT an actual cosine-sim implementation'));
});
