import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const profileSource = await readFile(
  new URL('../../app/profil/DonneesSection.tsx', import.meta.url),
  'utf8',
);
const erasureModalSource = await readFile(
  new URL('../../components/donnees/privacy-erasure-modal.tsx', import.meta.url),
  'utf8',
);

const UNSUPPORTED_ERASURE_PROMISES = [
  /sous\s+30\s+jours/i,
  /supprime\s+d[ée]finitivement/i,
  /supprimer\s+d[ée]finitivement/i,
  /suppression\s+effectu[ée]e/i,
];

test('active privacy surface cannot invoke the legacy simulated deletion success flow', () => {
  assert.match(profileSource, /PrivacyErasureUnavailableModal/);
  assert.doesNotMatch(profileSource, /\bDeleteModal\b/);
  assert.doesNotMatch(profileSource, /\bDeletedToastModal\b/);
});

test('active erasure copy states the fail-closed authority without invented timing or scope promises', () => {
  assert.match(erasureModalSource, /G-PRIV-ERASURE/);
  assert.match(erasureModalSource, /Effacement non disponible/);
  assert.match(erasureModalSource, /Aucune donnée n&(?:apos|#39);a été supprimée/);
  assert.match(erasureModalSource, /reste désactivé/);
  assert.match(erasureModalSource, /Aucun délai d&(?:apos|#39);effacement/);

  for (const forbidden of UNSUPPORTED_ERASURE_PROMISES) {
    assert.doesNotMatch(erasureModalSource, forbidden);
  }
});
