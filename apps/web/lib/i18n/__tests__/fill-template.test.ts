/**
 * Remplissage de placeholders du dictionnaire.
 *
 * Introduit pour les énoncés d'observation de la carte Repos, qui portent des
 * nombres — référence, fenêtre, minutes inexploitables. La convention employée
 * jusqu'ici, découper la phrase en fragments (`recoveryIntro`, `recoveryMiddle`,
 * `recoveryOutro`…), devient illisible dès qu'une phrase contient trois valeurs,
 * et elle casse à la traduction dès que l'ordre des mots change.
 *
 * Le choix de conception que ces tests verrouillent : une clé absente reste
 * VISIBLE. Rendre une chaîne vide produirait une phrase fausse mais plausible
 * — « 14 dernières nuits — médiane  interruptions,  min. » — qu'aucune
 * relecture ne rattraperait. Un `{interruptions}` en clair se remarque.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fillTemplate } from '../translate';

test('remplit les placeholders présents', () => {
  assert.equal(
    fillTemplate('{nights} dernières nuits — médiane {interruptions} interruptions, {duration} min.', {
      nights: 14,
      interruptions: 2,
      duration: 203,
    }),
    '14 dernières nuits — médiane 2 interruptions, 203 min.',
  );
});

test('accepte nombres et chaînes indifféremment', () => {
  assert.equal(fillTemplate('{a}/{b}', { a: 0, b: 'MAT' }), '0/MAT');
});

test('une clé absente reste visible, jamais remplacée par du vide', () => {
  // C'est le comportement qui compte : un trou se voit, une valeur manquante
  // silencieuse ne se voit pas.
  assert.equal(fillTemplate('médiane {interruptions} interruptions', {}), 'médiane {interruptions} interruptions');
  assert.equal(fillTemplate('{a} et {b}', { a: 'x' }), 'x et {b}');
});

test('une valeur zéro est rendue, pas traitée comme absente', () => {
  // `values[key] || ''` aurait effacé un zéro légitime — zéro interruption est
  // une observation, pas une absence de donnée.
  assert.equal(fillTemplate('{n} interruptions', { n: 0 }), '0 interruptions');
});

test('une chaîne vide fournie est respectée', () => {
  assert.equal(fillTemplate('[{v}]', { v: '' }), '[]');
});

test('une chaîne sans placeholder est rendue telle quelle', () => {
  const plain = 'Ni la qualité du sommeil, ni une cause.';
  assert.equal(fillTemplate(plain, { inutile: 1 }), plain);
});

test('les accolades qui ne forment pas un placeholder sont laissées intactes', () => {
  assert.equal(fillTemplate('{ espace } et {tiret-bas}', { espace: 'x' }), '{ espace } et {tiret-bas}');
});
