import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const routeUrl = new URL('../api/routes/data-export.ts', import.meta.url);
const policyUrl = new URL('../api/services/data-export-policy.ts', import.meta.url);

test('DATA-01: export route delegates inferred disclosure to controlled serializer', async () => {
  const route = await readFile(routeUrl, 'utf8');
  assert.match(route, /eliRows\.map\(serializeEliForGuardianExport\)/);
  assert.doesNotMatch(route, /inferred:\s*eliRows\.map\(\(row\)\s*=>\s*\(\{\s*\.\.\.row/s);
});

test('DATA-01: Guardian serializer never emits persisted valence', async () => {
  const policy = await readFile(policyUrl, 'utf8');
  assert.match(policy, /valence is internal to V1 and is never exported/);
  assert.doesNotMatch(policy, /valence:\s*row\.valence/);
});
