import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const modalPath = fileURLToPath(
  new URL('../../../components/donnees/modals.tsx', import.meta.url),
);

test('privacy deletion prototype cannot read as an executed erasure request', () => {
  const source = readFileSync(modalPath, 'utf8');

  assert.match(source, /Suppression simulée/);
  assert.match(source, /simule une demande de suppression/);
  assert.match(source, /aucune demande d'effacement n'a été envoyée/);
  assert.match(source, /Simuler la confirmation/);

  assert.doesNotMatch(source, /sous 30 jours/i);
  assert.doesNotMatch(source, /supprime définitivement/i);
  assert.doesNotMatch(source, /études anonymisées sous/i);
});
