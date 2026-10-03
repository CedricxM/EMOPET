import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [registrySource, rightsRegister] = await Promise.all([
  readFile(new URL('../../apps/web/lib/data/breiz/sourceRegistry.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/control/P0_THIRD_PARTY_DATA_RIGHTS_REGISTER.md', import.meta.url), 'utf8'),
]);

function sourceBlock(id) {
  const marker = `id: '${id}'`;
  const start = registrySource.indexOf(marker);
  assert.ok(start >= 0, `missing Breiz source ${id}`);
  const next = registrySource.indexOf("\n  {\n    id:", start + marker.length);
  return registrySource.slice(start, next >= 0 ? next : registrySource.indexOf("\n];", start));
}

test('BCD sources remain disabled and Bretania does not regain assumed OAI-PMH authority', () => {
  const becedia = sourceBlock('bcd-becedia');
  const bretania = sourceBlock('bretania');

  assert.match(becedia, /accessMode: 'manual_review'/);
  assert.match(becedia, /PARTNER_PERMISSION_REQUIRED/);
  assert.match(becedia, /enabled: false/);
  assert.match(becedia, /do not bulk-scrape or vectorize full text/i);

  assert.match(bretania, /accessMode: 'metadata'/);
  assert.match(bretania, /enabled: false/);
  assert.match(bretania, /no supported public OAI-PMH endpoint is established/i);
  assert.doesNotMatch(bretania, /accessMode: 'oai_pmh'/);
});

test('SIRENE and DATAtourisme technical catalogue entries remain disabled', () => {
  const sirene = sourceBlock('sirene');
  const datatourisme = sourceBlock('datatourisme');

  assert.match(sirene, /enabled: false/);
  assert.match(sirene, /X-INSEE-Api-Key-Integration/);
  assert.match(sirene, /data minimisation/i);

  assert.match(datatourisme, /enabled: false/);
  assert.match(datatourisme, /license: 'Licence Ouverte 2\.0'/);
  assert.match(datatourisme, /X-API-Key/);
  assert.match(datatourisme, /HasBeenCreatedBy/);
  assert.match(datatourisme, /API-v1 CGU scope\/recheck authority must be clarified/i);
  assert.match(
    datatourisme,
    /datatourisme-api-rights-observation-2026-10-03\.json/,
  );
  assert.doesNotMatch(datatourisme, /rightsEvidence\s*:/);
});

test('controlled rights register records the 2026-09-29 non-promotion boundary', () => {
  assert.match(rightsRegister, /### 0\.4 Breiz \/ territorial-source reconciliation — 2026-09-29/);
  assert.match(rightsRegister, /BREIZ_BCD_INGESTION = HOLD/);
  assert.match(rightsRegister, /BRETANIA_OAI_PMH = NOT_ESTABLISHED/);
  assert.match(rightsRegister, /G-THIRD-PARTY-DATA-RIGHTS-01 = OPEN/);
  assert.doesNotMatch(
    rightsRegister.match(/### 0\.4[\s\S]*?(?=\n## 1\.)/)?.[0] ?? '',
    /\b(?:CLEARED|COMPLIANT|RELEASED)\b/,
  );
});
