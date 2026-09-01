import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('health journal route does not acknowledge an unpersisted entry', () => {
  const source = readFileSync(new URL('../api/routes/health.ts', import.meta.url), 'utf8');

  assert.match(source, /health_entry_persistence_not_implemented/);
  assert.match(source, /},\s*501\s*\);/s);
  assert.doesNotMatch(source, /message:\s*['"]entry_created['"]/);
});
