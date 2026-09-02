import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../api/routes/health.ts', import.meta.url), 'utf8');

test('health entry read does not report a fake successful empty result', () => {
  assert.match(source, /health_entry_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, entries: \[\] \}\)/);
});

test('health reminder read does not report a fake successful empty result', () => {
  assert.match(source, /health_reminder_read_not_implemented/);
  assert.doesNotMatch(source, /return c\.json\(\{ dogId, reminders: \[\] \}\)/);
});

test('write and both read placeholders are explicit 501 states on the stacked candidate', () => {
  assert.match(source, /health_entry_persistence_not_implemented/);
  const notImplementedResponses = source.match(/},\s*501\s*\);/g) ?? [];
  assert.ok(notImplementedResponses.length >= 3);
});
