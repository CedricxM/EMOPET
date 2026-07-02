/**
 * Tests races (Partie A) — import FCI traçable, sans donnée inventée.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapCoat, mapSize } from '../breeds';
import { getBreed, listBreeds, searchBreeds } from '../server/breeds';

test('mappage pelage : sûr ou null (jamais deviné)', () => {
  assert.equal(mapCoat('smooth'), 'court');
  assert.equal(mapCoat('short'), 'court');
  assert.equal(mapCoat('long'), 'long');
  assert.equal(mapCoat('double_long'), 'double');
  assert.equal(mapCoat('wire'), null); // ambigu → null
  assert.equal(mapCoat(null), null);
});

test('mappage gabarit', () => {
  assert.equal(mapSize('giant'), 'geant');
  assert.equal(mapSize('small'), 'petit');
  assert.equal(mapSize('toy_small'), 'toy');
  assert.equal(mapSize(undefined), null);
});

test('référentiel chargé (335 races) + races de référence correctes', () => {
  const all = listBreeds();
  assert.ok(all.length >= 330, `count=${all.length}`);
  const beauceron = getBreed('fci-44');
  assert.ok(beauceron && beauceron.fciGroup === '1', 'Beauceron 44/G1');
  const labrador = getBreed('fci-122');
  assert.ok(labrador && labrador.fciGroup === '8', 'Labrador 122/G8');
});

test('traçabilité : VERIFIED ⇒ numéro+groupe+pays ; sinon PENDING_VERIFIED', () => {
  const all = listBreeds();
  for (const b of all) {
    if (b.verificationStatus === 'VERIFIED') {
      assert.ok(b.fciStandardNumber != null && b.fciGroup != null && b.countryOfOrigin, `${b.id} VERIFIED incomplet`);
    }
    assert.ok(b.source.includes('FCI'));
  }
  // Il existe des entrées PENDING (pays manquant dans la source).
  assert.ok(all.some((b) => b.verificationStatus === 'PENDING_VERIFIED'), 'des entrées PENDING attendues');
});

test('aucune morphologie inventée : coat/size ∈ valeurs connues ou null', () => {
  for (const b of listBreeds()) {
    assert.ok(b.coatTypeDefault === null || ['court', 'moyen', 'long', 'double'].includes(b.coatTypeDefault));
    assert.ok(b.sizeCategory === null || ['toy', 'petit', 'moyen', 'grand', 'geant'].includes(b.sizeCategory));
  }
});

test('recherche par nom', () => {
  assert.ok(searchBreeds('labrador').some((b) => /labrador/i.test(b.nameOfficial)));
});
