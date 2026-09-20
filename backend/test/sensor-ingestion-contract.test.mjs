import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('sensor summary route acknowledges only durable provenance-backed persistence', () => {
  const source = readFileSync(new URL('../api/routes/sensors.ts', import.meta.url), 'utf8');

  assert.match(source, /SENSOR_PROVENANCE_REQUIRED/);
  assert.match(source, /SENSOR_SOURCE_FIELDS_INVALID/);
  assert.match(source, /insert\(sensorSummaries\)/);
  assert.match(source, /onConflictDoNothing\(\{ target: sensorSummaries\.ingestionId \}\)/);
  assert.match(source, /firmwareVersionAtIngest: boundDevice\.firmwareVersion/);
  assert.match(source, /PRODUCT_DATABASE_OPERATION_UNAVAILABLE/);
  assert.doesNotMatch(source, /sensor_summary_ingestion_not_implemented/);
  assert.doesNotMatch(source, /message:\s*['"]ingested['"]/);
});
