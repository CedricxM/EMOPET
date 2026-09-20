import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');

test('sensor summary read uses the authoritative owner-scoped PostgreSQL source', () => {
  assert.match(source, /select\(\)\s*\.from\(sensorSummaries\)/s);
  assert.match(source, /eq\(sensorSummaries\.dogId, dogId\)/);
  assert.match(source, /PRODUCT_DATABASE_OPERATION_UNAVAILABLE/);
  assert.doesNotMatch(source, /sensor_summary_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, range, summaries: \[\] \}\)/);
});

test('baseline read does not report a fake successful null result', () => {
  assert.match(source, /baseline_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, baseline: null \}\)/);
});

test('presence-event read uses the shared fail-closed temporal window parser', () => {
  assert.match(source, /parseLookbackWindow\(c\.req\.query\('days'\)\)/);
  assert.match(source, /invalid_presence_window/);
  assert.doesNotMatch(source, /Number\(c\.req\.query\('days'\)/);
});

test('ELI and baseline placeholder reads remain explicit maturity states while summaries are durable', () => {
  assert.doesNotMatch(source, /sensor_summary_ingestion_not_implemented/);
  assert.doesNotMatch(source, /sensor_summary_read_not_implemented/);
  assert.match(source, /eli_runtime_not_implemented/);
  assert.match(source, /baseline_read_not_implemented/);
});
