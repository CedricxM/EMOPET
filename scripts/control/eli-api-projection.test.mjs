import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ELI API projection remains non-activated and AVAILABLE semantics are blocked', async () => {
  const cfg = JSON.parse(await readFile(new URL('../../config/eli/api-projection-v1.json', import.meta.url), 'utf8'));
  assert.equal(cfg.status, 'CONTRACT_CANDIDATE / ENDPOINT_NOT_ACTIVATED');
  assert.equal(cfg.currentEndpointSelection, null);
  assert.equal(cfg.currentRuntime, 'NOT_IMPLEMENTED');
  assert.equal(cfg.availableProjection.semanticSubtype, 'BLOCKED_PENDING_SCIENCE_AND_PRODUCT_AUTHORITY');
  assert.deepEqual(cfg.availableProjection.authorizedObservationTypes, []);
  assert.equal(cfg.routeActivation.allowed, false);
  assert.equal(cfg.routeActivation.existing501MustRemain, true);
});

test('public ELI observation contract does not expose internal latent fields', async () => {
  const source = await readFile(new URL('../../packages/shared/src/types/eli-api.ts', import.meta.url), 'utf8');
  const start = source.indexOf('export interface EliPublicObservationBase');
  const end = source.indexOf('export type EliAuthorizedPublicObservation');
  const base = source.slice(start, end);
  assert.doesNotMatch(base, /\bvalence\s*:/);
  assert.doesNotMatch(base, /\bload\s*:/);
  assert.doesNotMatch(base, /sensorReliability\s*:/);
  assert.match(source, /EliAuthorizedPublicObservation = never/);
});

test('current backend ELI reads remain honest 501 placeholders', async () => {
  const source = await readFile(new URL('../../backend/api/routes/sensors.ts', import.meta.url), 'utf8');
  const occurrences = source.match(/eli_runtime_not_implemented/g) ?? [];
  assert.equal(occurrences.length, 2);
});

test('legacy ELI display helper is explicitly not the public API contract', async () => {
  const source = await readFile(new URL('../../packages/shared/src/types/eli.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('NOT the public Care/API projection authority'));
  assert.ok(source.includes('not authorized as the future Care projection'));
});
