/**
 * Tests i18n (Partie D) — résolution FR/EN, parité des clés, détection,
 * formatage localisé (dates/nombres/unités).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fr, en } from '../dictionaries';
import {
  detectLocale,
  formatDateLocale,
  formatDistanceLocale,
  formatNumberLocale,
  isLocale,
  translate,
} from '../translate';

test('résolution de clé selon la locale', () => {
  assert.equal(translate('fr', 'nav', 'contact'), 'Parler à l’équipe');
  assert.equal(translate('en', 'nav', 'contact'), 'Talk to the team');
  assert.equal(translate('fr', 'common', 'save'), 'Enregistrer');
  assert.equal(translate('en', 'common', 'save'), 'Save');
});

test('parité des clés FR/EN (aucune clé manquante)', () => {
  for (const ns of Object.keys(fr) as Array<keyof typeof fr>) {
    const frKeys = Object.keys(fr[ns]).sort();
    const enKeys = Object.keys(en[ns]).sort();
    assert.deepEqual(enKeys, frKeys, `namespace ${ns} : clés divergentes`);
  }
});

test('détection : préférence > navigateur > défaut FR', () => {
  assert.equal(detectLocale('en', 'fr-FR'), 'en'); // préférence prime
  assert.equal(detectLocale(null, 'en-US'), 'en'); // navigateur
  assert.equal(detectLocale(null, 'fr-FR'), 'fr');
  assert.equal(detectLocale(null, null), 'fr'); // défaut
  assert.equal(detectLocale('xx', 'de-DE'), 'fr'); // invalides → défaut
});

test('isLocale', () => {
  assert.ok(isLocale('fr') && isLocale('en'));
  assert.ok(!isLocale('de') && !isLocale(null));
});

test('formatage localisé : nombres, distances, dates', () => {
  assert.notEqual(formatNumberLocale(1234.5, 'fr'), formatNumberLocale(1234.5, 'en'));
  assert.match(formatDistanceLocale(3200, 'fr'), /3,2 km/);
  assert.match(formatDistanceLocale(3200, 'en'), /3\.2 km/);
  const d = '2026-06-05T10:00:00Z';
  assert.match(formatDateLocale(d, 'fr'), /juin/);
  assert.match(formatDateLocale(d, 'en'), /June/);
});
