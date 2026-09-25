import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const evidenceUrl = new URL('../../apps/web/lib/eli/eli-proxy-evidence.json', import.meta.url);
const catalogUrl = new URL('../../apps/web/lib/eli/catalog.ts', import.meta.url);

test('all 23 Guardian-facing proxies have controlled evidence classifications', async () => {
  const evidence = JSON.parse(await readFile(evidenceUrl, 'utf8'));
  const catalog = await readFile(catalogUrl, 'utf8');
  const ids = [...catalog.matchAll(/\{ id: '([ARGS]\d\d)'/g)].map((m) => m[1]);
  const unique = [...new Set(ids)];

  assert.equal(unique.length, 23, 'catalogue must expose the expected 23 proxy IDs');
  assert.deepEqual(Object.keys(evidence.proxies).sort(), unique.sort());
});

test('claim statuses are bounded and none silently claims proxy-specific validation', async () => {
  const evidence = JSON.parse(await readFile(evidenceUrl, 'utf8'));
  const allowed = new Set(evidence.allowedStatuses);

  for (const [id, entry] of Object.entries(evidence.proxies)) {
    assert.ok(allowed.has(entry.claimStatus), id + ' has an unknown evidence status');
    assert.ok(entry.source);
    assert.ok(entry.note);
    assert.notEqual(entry.claimStatus, 'SUPPORTED');
    assert.notEqual(entry.claimStatus, 'VALIDATED');
  }
});

test('G02 remains behind the dedicated respiratory-variability gate', async () => {
  const evidence = JSON.parse(await readFile(evidenceUrl, 'utf8'));
  assert.equal(evidence.proxies.G02.claimStatus, 'SEPARATE_GATE');
  assert.match(evidence.proxies.G02.note, /#86/);
});
