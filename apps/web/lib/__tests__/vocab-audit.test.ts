/**
 * Tests du garde-fou vocabulaire (scripts/forbidden-vocab.mjs).
 *
 * Couvre la frontière la plus critique d'EMOPET — aucune anthropomorphisation,
 * aucun score émotionnel, aucun claim médical — TOUT en respectant la règle de
 * précision : les disclaimers et négations légitimes ne sont JAMAIS signalés
 * (négations légitimes, mention non médicale, formulation de bien-être).
 *
 * Les phrases interdites d'exemple sont assemblées par concaténation pour que ce
 * fichier ne contienne pas les littéraux proscrits (cohérent avec les autres tests).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LITERALS, scanText } from '../../scripts/forbidden-vocab.mjs';

test('texte conforme (observations factuelles) → aucune correspondance', () => {
  const ok = "Sommeil profond 7 h 28. Activité réduite observée. Phase de repos prolongée. Retour au calme.";
  assert.deepEqual(scanText(ok), []);
});

test('chaque tournure littérale interdite est détectée', () => {
  for (const term of LITERALS) {
    const sentence = `Section : ${term} sur la semaine.`;
    assert.ok(scanText(sentence).includes(term), `non détecté : "${term}"`);
  }
});

test('détection insensible à la casse', () => {
  const upper = 'SCORE DE ' + 'BONHEUR';
  assert.ok(scanText(upper).length >= 1, 'majuscules non détectées');
});

test('anthropomorphisation : émotion attribuée au chien → détectée', () => {
  const samples = [
    'On dirait qu' + "'il s" + "'" + 'ennuie aujourd' + "'hui.",
    'Capitaine a fait un bon r' + 'êve cette nuit.',
    'Le chien semble ' + 'déprimé ce matin.',
    'Le chien est ' + 'str' + 'essé pendant l' + "'orage.",
    'Le chien a ' + 'pe' + 'ur des feux d' + "'artifice.",
    'La chienne paraît ' + 'anxieuse au retour.',
    'Il res' + 'sent de la ' + 'pe' + 'ur quand tu pars.',
  ];
  for (const s of samples) {
    assert.ok(scanText(s).length > 0, `non détecté : "${s}"`);
  }
});

test('émotion traitée comme une mesure → détectée', () => {
  const samples = [
    'niveau de ' + 'str' + 'ess',
    'score d' + "'" + 'anxi' + 'été',
    'indice de ' + 'bonheur',
    'jauge de ' + 'jo' + 'ie',
    'anxi' + 'été ' + 'détectée ce soir',
    'str' + 'ess ' + 'élevé constaté',
  ];
  for (const s of samples) {
    assert.ok(scanText(s).length > 0, `non détecté : "${s}"`);
  }
});

test('claims médicaux / diagnostiques affirmatifs → détectés', () => {
  const samples = [
    'détection de ' + 'mala' + 'die cardiaque',
    'ris' + 'que ' + 'cardiaque élevé',
    'al' + 'erte ' + 'san' + 'té : à surveiller',
    'diag' + 'nostic de surpoids',
  ];
  for (const s of samples) {
    assert.ok(scanText(s).length > 0, `non détecté : "${s}"`);
  }
});

test('PRÉCISION : disclaimers, négations et termes légitimes ne sont JAMAIS signalés', () => {
  const allowed = [
    // négations / disclaimers (le mot émotionnel ou médical y est légitime)
    'EMOPET ne mesure pas l' + "'" + 'anxi' + 'été ni le str' + 'ess du chien.',
    'Le chien n' + "'est pas " + 'anxieux, simplement en éveil.',
    'EMOPET n' + "'affiche aucun score de " + 'bonheur.',
    'Dispositif non médical : aucune affirmation de ' + 'mala' + 'die.',
    'Breiz ne pose aucun ' + 'diag' + 'nostic.',
    "Breiz ne formule pas d'évaluation " + 'vétérinaire.',
    // termes EMOPET légitimes
    'Indicateurs de bien-' + 'être non médicaux.',
    'Pour un avis, consultez votre ' + 'vétérinaire.',
    // homonymes non émotionnels (ne doivent pas matcher)
    "Niveau d'activité élevé aujourd'hui.",
    'Score de couverture du capteur : 80 %.',
    'Tendance baisse d' + "'activité sur 7 jours.",
  ];
  for (const s of allowed) {
    assert.deepEqual(scanText(s), [], `faux positif : "${s}"`);
  }
});
