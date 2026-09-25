import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ELI dynamics parameter map keeps anticipation/recovery constants unvalidated', async () => {
  const url = new URL('../../config/science/eli-dynamics-parameter-authority.json', import.meta.url);
  const cfg = JSON.parse(await readFile(url, 'utf8'));
  for (const p of Object.values(cfg.anticipation.parameters)) {
    assert.equal(p.status, 'EMOPET_HEURISTIC_UNVALIDATED');
  }
  for (const p of Object.values(cfg.recovery.parameters)) {
    assert.equal(p.status, 'EMOPET_HEURISTIC_UNVALIDATED');
  }
  assert.equal(cfg.recovery.bleizPersistence.status, 'FAIL_CLOSED_UNTIL_RUNTIME_FIELD_EXISTS');
});

test('anticipation result exposes raw occurrences separately from threshold hits', async () => {
  const url = new URL('../../packages/shared/src/types/inference.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('event_occurrence_count'));
  assert.ok(source.includes('above_threshold_hit_count'));
  assert.ok(source.includes('@deprecated Ambiguous v6 field retained for compatibility'));
});

test('recovery Bleiz publication requires explicit seven-day persistence field', async () => {
  const url = new URL('../../packages/ai-personality/src/bleiz/bleiz-v6-templates.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes("'sensor.recovery_trend_sustained_days'"));
  assert.ok(source.includes("field: 'sensor.recovery_trend_sustained_days'"));
  assert.ok(source.includes("operator: 'gte'"));
  assert.ok(source.includes('value: 7'));
});
