import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, validateEvidence } from './mat-phase0a-evidence-ingest.mjs';

const manifest = `run_id,test_article_id,mat_pcb_or_assembly_revision,source_revision_or_package_hash,bom_revision,acquisition_configuration,fixture_revision,power_supply_configuration,sensor_channel_mapping,operator,started_at,timezone,deviation_note
RUN-001,MAT-001,REV-A,sha256:abc,BOM-A,CFG-1,FIX-1,5V bench supply,CH1=PZ1,operator,2026-10-02T08:00:00+02:00,Europe/Paris,
`;
const sample = (state='OBSERVED', value='123') => `timestamp,run_id,test_article_id,channel,value,representation,sample_rate_hz,acquisition_configuration,supply_condition,stimulus_or_reference_marker,data_state,notes
2026-10-02T08:00:01+02:00,RUN-001,MAT-001,CH1,${value},ADC_COUNTS,100,CFG-1,5V bench supply,,${state},
`;

test('accepts a provenance-complete engineering run', () => {
  const result = validateEvidence(parseCsv(manifest), parseCsv(sample()));
  assert.equal(result.status, 'ACCEPTED_FOR_ENGINEERING_ANALYSIS');
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.observedSamples, 1);
  assert.equal(result.boundaries.incrementalValueDecision, false);
});

test('rejects mixed run identity', () => {
  const bad = sample().replace('RUN-001,MAT-001,CH1', 'RUN-999,MAT-001,CH1');
  const result = validateEvidence(parseCsv(manifest), parseCsv(bad));
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.errors.some((e) => e.includes('run_id mismatch')));
});

test('allows explicit missing value without inventing zero', () => {
  const result = validateEvidence(parseCsv(manifest), parseCsv(sample('MISSING', '')));
  assert.equal(result.status, 'INCOMPLETE');
});

test('accepts observed numeric zero', () => {
  assert.equal(validateEvidence(parseCsv(manifest), parseCsv(sample('OBSERVED', '0'))).status, 'ACCEPTED_FOR_ENGINEERING_ANALYSIS');
});

test('rejects zero used to encode missing data', () => {
  const result = validateEvidence(parseCsv(manifest), parseCsv(sample('MISSING', '0')));
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.errors.some((e) => e.includes('uses zero')));
});

test('rejects unknown data states', () => {
  const result = validateEvidence(parseCsv(manifest), parseCsv(sample('MAGIC', '123')));
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.errors.some((e) => e.includes('unknown data_state')));
});

test('rejects placeholder manifest authority', () => {
  const badManifest = manifest.replace('sha256:abc', 'TBD');
  const result = validateEvidence(parseCsv(badManifest), parseCsv(sample()));
  assert.equal(result.status, 'INCOMPLETE');
  assert.ok(result.incomplete.some((e) => e.includes('source_revision_or_package_hash')));
});

test('rejects invalid observed sample rate', () => {
  const bad = sample().replace(',100,CFG-1,', ',0,CFG-1,');
  const result = validateEvidence(parseCsv(manifest), parseCsv(bad));
  assert.equal(result.status, 'REJECTED');
  assert.ok(result.errors.some((e) => e.includes('sample_rate_hz')));
});

test('marks NOT_RUN-only evidence incomplete', () => {
  assert.equal(validateEvidence(parseCsv(manifest), parseCsv(sample('NOT_RUN', ''))).status, 'INCOMPLETE');
});
