import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');

test('sensor summary read does not report a fake successful empty result', () => {
  assert.match(source, /sensor_summary_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, range, summaries: \[\] \}\)/);
});

test('baseline read does not report a fake successful null result', () => {
  assert.match(source, /baseline_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, baseline: null \}\)/);
});

test('both protected placeholder reads remain explicit 501 states', () => {
  const notImplementedResponses = source.match(/},\s*501\s*\);/g) ?? [];
  // POST summary ingestion from base #95 + GET summaries + GET baseline.
  assert.ok(notImplementedResponses.length >= 3);
});
