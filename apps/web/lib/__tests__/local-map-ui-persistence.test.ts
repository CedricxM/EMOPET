import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

function source(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

test('LocalSection ne publie un succès local qu’après écriture durable', () => {
  const text = source('../../app/quartier/LocalSection.tsx');

  assert.match(text, /persistUserSpotFallback\(localStorage, STORAGE_SPOTS, newSpot\)\.ok/);
  assert.match(text, /Impossible d’enregistrer ce spot pour le moment\. Rien n’a été ajouté\./);
  assert.match(text, /return false;/);

  // L’ancien commentaire éphémère n’existe plus : un échec serveur ne fabrique
  // plus une réponse en mémoire avec un id c-<timestamp>.
  assert.doesNotMatch(text, /id:\s*`c-\$\{Date\.now\(\)\}`/);
  assert.match(text, /Impossible de publier ce commentaire pour le moment\. Votre texte est conservé\./);

  // Aucun backend de signalement de spot n'existe : le client doit refuser le
  // faux accusé « transmis à la modération ».
  assert.match(text, /async function handleFlagSpot\(_spotId: string\): Promise<boolean>/);
  assert.doesNotMatch(text, /spotFlagged/);
});

test('les modals conservent les saisies tant que la persistance n’est pas confirmée', () => {
  const text = source('../../components/bretagne-map/spot-modals.tsx');

  assert.match(text, /const saved = await onAddComment\(spot\.id, trimmed\);/);
  assert.match(text, /const saved = await onCreate\(\{ category, name: name\.trim\(\), description: description\.trim\(\), isAnonymous \}\);/);
  assert.match(text, /if \(saved\) \{\s*reset\(\);/);
  assert.match(text, /Impossible d’enregistrer ce spot pour le moment\. Vos informations sont conservées\./);
  assert.match(text, /Rien n’a été transmis\./);
  assert.match(text, /const submitted = await onFlag\(spot\.id\);/);

  // Régression historique : submit() appelait onCreate puis reset() sans attendre.
  assert.doesNotMatch(text, /onCreate\([^;]+\);\s*reset\(\);/s);
});