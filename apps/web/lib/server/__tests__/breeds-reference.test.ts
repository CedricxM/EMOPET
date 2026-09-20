/**
 * Référentiel des races — « illisible » n'est pas « aucune race ».
 *
 * `listBreeds()` enveloppait tout le chargement dans `catch { cache = [] }`.
 * Deux conséquences, dont la seconde est la plus grave :
 *
 *  1. la liste vide était indiscernable d'un référentiel réellement vide, et la
 *     route répondait `ok: true, count: 0` — une affirmation positive qu'aucune
 *     race n'existe — ou `404 not_found` sur un id précis ;
 *  2. cette liste vide était MISE EN CACHE. Une indisponibilité passagère au
 *     tout premier appel condamnait le processus entier à répondre « aucune
 *     race » jusqu'à son redémarrage, même une fois la source revenue.
 *
 * Le module résout sa source à CHAQUE appel (`join(process.cwd(), '..', '..',
 * …)`), et non à l'import : déplacer le répertoire de travail est donc un levier
 * de test valide ici — contrairement au store JSON.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  BreedReferenceUnavailableError,
  getBreed,
  listBreeds,
  resetBreedCacheForTests,
  searchBreeds,
} from '../breeds';

const REAL_CWD = process.cwd();

/**
 * Exécute `run` depuis un répertoire de travail dont `../../data/` contient
 * `contents` — ou rien du tout si `contents` est `null`.
 */
function withSourceContents<T>(contents: string | null, run: () => T): T {
  const root = mkdtempSync(path.join(tmpdir(), 'emopet-breeds-'));
  const cwd = path.join(root, 'apps', 'web');
  mkdirSync(cwd, { recursive: true });
  if (contents !== null) {
    mkdirSync(path.join(root, 'data'), { recursive: true });
    writeFileSync(path.join(root, 'data', 'breed_profiles.json'), contents, 'utf8');
  }
  resetBreedCacheForTests();
  process.chdir(cwd);
  try {
    return run();
  } finally {
    // Toujours restaurer : le cwd et le cache sont globaux au processus de test.
    process.chdir(REAL_CWD);
    resetBreedCacheForTests();
  }
}

/* ------------------------------------------------------------------ */
/* 1. L'empoisonnement de cache, qui rendait la panne définitive       */
/* ------------------------------------------------------------------ */

test('un échec de chargement n’est pas mis en cache', () => {
  withSourceContents(null, () => {
    assert.throws(() => listBreeds(), BreedReferenceUnavailableError);
  });

  // La source est de nouveau lisible : l'appel suivant doit réussir.
  // Avant le correctif, il renvoyait `[]` pour toute la vie du processus.
  const breeds = listBreeds();
  assert.ok(breeds.length > 300, `référentiel rechargé attendu, obtenu ${breeds.length} races`);
});

/* ------------------------------------------------------------------ */
/* 2. Indisponible ≠ vide, sur les trois points d'entrée               */
/* ------------------------------------------------------------------ */

test('source absente = état inconnu, jamais une liste vide', () => {
  withSourceContents(null, () => {
    assert.throws(() => listBreeds(), (error: unknown) => {
      assert.ok(error instanceof BreedReferenceUnavailableError);
      assert.match(error.message, /pas vide/);
      return true;
    });
  });
});

test('source JSON invalide = état inconnu', () => {
  withSourceContents('[{"fci_number":', () => {
    assert.throws(() => listBreeds(), BreedReferenceUnavailableError);
  });
});

test('source non tableau = état inconnu', () => {
  withSourceContents('{"races": []}', () => {
    assert.throws(() => listBreeds(), BreedReferenceUnavailableError);
  });
});

test('getBreed et searchBreeds propagent l’indisponibilité', () => {
  withSourceContents(null, () => {
    // Sans cela, `getBreed` renverrait `undefined` et la route répondrait 404 :
    // « cette race n'existe pas », alors qu'on ignore ce que contient la source.
    assert.throws(() => getBreed('fci-122'), BreedReferenceUnavailableError);
    assert.throws(() => searchBreeds('labrador'), BreedReferenceUnavailableError);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Le chemin nominal n'a pas bougé                                  */
/* ------------------------------------------------------------------ */

test('un référentiel réellement vide reste une réponse vide, sans erreur', () => {
  withSourceContents('[]', () => {
    // Distinction essentielle : vide légitime ≠ illisible.
    assert.deepEqual(listBreeds(), []);
  });
});

test('chargement nominal : races normalisées, triées, avec provenance', () => {
  withSourceContents(
    JSON.stringify([
      { fci_number: 122, breed_name_fr: 'Labrador Retriever', fci_group: 8, country_origin: 'Royaume-Uni' },
      { fci_number: 44, breed_name_fr: 'Beauceron', fci_group: 1, country_origin: 'France' },
      { breed_name_fr: 'Race sans standard' },
    ]),
    () => {
      const all = listBreeds();
      assert.deepEqual(all.map((b) => b.nameOfficial), ['Beauceron', 'Labrador Retriever', 'Race sans standard']);
      assert.equal(getBreed('fci-122')?.verificationStatus, 'VERIFIED');
      // Pas de n° de standard / groupe / pays → jamais promu VERIFIED.
      assert.equal(all.find((b) => b.nameOfficial === 'Race sans standard')?.verificationStatus, 'PENDING_VERIFIED');
      assert.equal(getBreed('fci-44')?.sourceVersion, '2026-04');
    },
  );
});

test('le cache évite de relire la source après un chargement réussi', () => {
  withSourceContents(JSON.stringify([{ fci_number: 44, breed_name_fr: 'Beauceron', fci_group: 1, country_origin: 'France' }]), () => {
    const first = listBreeds();
    const second = listBreeds();
    assert.equal(first, second, 'la même instance doit être servie depuis le cache');
  });
});
