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
  assert.equal(cfg.anticipation.guardianPublicationAuthorized, false);
  assert.equal(cfg.anticipation.publicationGate.defaultAuthorized, false);
  assert.equal(cfg.recovery.guardianPublicationAuthorized, false);
  assert.equal(cfg.recovery.publicationGate.defaultAuthorized, false);
  assert.equal(cfg.anticipation.semanticStatus, 'HOLD_PENDING_SEMANTIC_DECISION');
  assert.match(cfg.anticipation.documentedAlternative.recurrenceMethod, /PLUS_OR_MINUS_30_MINUTES/);
  assert.equal(cfg.recovery.semanticStatus, 'HOLD_PENDING_SEMANTIC_DECISION');
  assert.equal(cfg.recovery.documentedAlternative.episodeStart, 'SUSTAINED_ABOVE_HIGH_FOR_60_SECONDS');
});

test('anticipation result exposes raw occurrences separately from threshold hits', async () => {
  const url = new URL('../../packages/shared/src/types/inference.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes('event_occurrence_count'));
  assert.ok(source.includes('above_threshold_hit_count'));
  assert.ok(source.includes('@deprecated Ambiguous v6 field retained for compatibility'));
});

test('anticipation Bleiz publication requires explicit #89 contract authority', async () => {
  const url = new URL('../../packages/ai-personality/src/bleiz/bleiz-v6-templates.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes("'sensor.anticipation_contract_authorized'"));
  assert.ok(source.includes("field: 'sensor.anticipation_contract_authorized'"));
  assert.ok(source.includes('Anticipation contract explicitly authorized under #89'));
});

test('recovery Bleiz publication requires #90 contract authority plus seven-day persistence', async () => {
  const url = new URL('../../packages/ai-personality/src/bleiz/bleiz-v6-templates.ts', import.meta.url);
  const source = await readFile(url, 'utf8');
  assert.ok(source.includes("'sensor.recovery_contract_authorized'"));
  assert.ok(source.includes("field: 'sensor.recovery_contract_authorized'"));
  assert.ok(source.includes('Recovery contract explicitly authorized under #90'));
  assert.ok(source.includes("'sensor.recovery_trend_sustained_days'"));
  assert.ok(source.includes("field: 'sensor.recovery_trend_sustained_days'"));
  assert.ok(source.includes("operator: 'gte'"));
  assert.ok(source.includes('value: 7'));
});
