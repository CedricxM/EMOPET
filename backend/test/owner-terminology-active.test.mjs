import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const guardianRoleWord = /\bguardians?\b/iu;

test('active owner-scoped backend integration tests do not use Guardian as the owner role', async () => {
  const sources = await Promise.all([
    readFile(new URL('./data-export-runtime.integration.test.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./dog-crud.integration.test.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./health-entries.integration.test.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./sensor-runtime.integration.test.mjs', import.meta.url), 'utf8'),
  ]);

  for (const source of sources) {
    assert.doesNotMatch(source, guardianRoleWord);
  }
});
