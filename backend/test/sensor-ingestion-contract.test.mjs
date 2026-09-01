import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('sensor summary route does not acknowledge discarded data', () => {
  const source = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');

  assert.match(source, /sensor_summary_ingestion_not_implemented/);
  assert.match(source, /},\s*501\s*\);/s);
  assert.doesNotMatch(source, /message:\s*['"]ingested['"]/);
});
