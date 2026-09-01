import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('dog CRUD routes do not acknowledge unperformed writes', () => {
  const source = readFileSync(new URL('../api/routes/dogs.ts', import.meta.url), 'utf8');

  assert.match(source, /dog_creation_not_implemented/);
  assert.match(source, /dog_update_not_implemented/);
  assert.match(source, /dog_deletion_not_implemented/);

  assert.doesNotMatch(source, /message:\s*['"]created['"]/);
  assert.doesNotMatch(source, /message:\s*['"]updated['"]/);
  assert.doesNotMatch(source, /message:\s*['"]deleted['"]/);

  const notImplementedResponses = source.match(/},\s*501\s*\);/g) ?? [];
  assert.ok(notImplementedResponses.length >= 3);
});
