import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const englishRoleWord = /\bguardians?\b/iu;

test('canonical BOLA QA matrix uses Owner and Trusted Caregiver terminology', async () => {
  const matrix = await readFile(
    new URL('../../../docs/qa/EMOPET_OWNER_AUTHORITY_BOLA_MATRIX_v0.1.md', import.meta.url),
    'utf8',
  );

  assert.match(matrix, /Owner Authority BOLA Matrix/);
  assert.match(matrix, /primary Owner of target dog/);
  assert.match(matrix, /trusted Caregiver with exact required capability/);
  assert.match(matrix, /G-GUARDIAN-BOLA-QA-01 = NOT_RUN/);
  assert.doesNotMatch(matrix, /primary Guardian|trusted Guardian|Guardian status|Trusted Guardian/iu);
  assert.doesNotMatch(matrix, englishRoleWord);
});
