import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('presence comparison authority blocks row-count hourly publication', async () => {
  const cfg = JSON.parse(await readFile(new URL('../../config/science/presence-comparison-authority.json', import.meta.url), 'utf8'));
  assert.equal(cfg.windowContract.rowCountMayRepresentHours, false);
  assert.equal(cfg.sourceSemantics.missingMayEqualZero, false);
  assert.equal(cfg.publication.ratesPerHour, 'BLOCKED');
  assert.equal(cfg.publication.validHours, 'BLOCKED');
  assert.equal(cfg.publication.publishDegradeReject, 'BLOCKED');
});

test('legacy presence calculator is explicitly quarantined and absent from production route', async () => {
  const service = await readFile(new URL('../../backend/api/services/presence.ts', import.meta.url), 'utf8');
  const route = await readFile(new URL('../../backend/api/routes/dogs.ts', import.meta.url), 'utf8');
  assert.ok(service.includes('@deprecated PROTOTYPE / NON-AUTHORITATIVE under #133'));
  assert.doesNotMatch(route, /computePresenceComparison/);
});

test('new source contract distinguishes measured zero from unavailable source', async () => {
  const source = await readFile(new URL('../../backend/api/services/presence-hourly-contract.ts', import.meta.url), 'utf8');
  assert.ok(source.includes("{ state: 'MEASURED'; value: T }"));
  assert.ok(source.includes("{ state: 'SOURCE_NOT_APPLICABLE' }"));
  assert.ok(source.includes('mat_cannot_measure_tag_only_behavior_fields'));
  assert.ok(source.includes('tag_cannot_measure_mat_presence'));
  assert.ok(source.includes('coveredSeconds'));
});
