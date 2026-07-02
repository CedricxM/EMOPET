/**
 * Tests communauté — modération (filtre mots interdits) + validations
 * posts/événements + builders.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildEvent,
  buildPost,
  containsForbiddenContent,
  publicCommunityCoordinate,
  validateEventInput,
  validatePostInput,
} from '../community';

test('filtre modération : détecte spam / liens / propos déplacés', () => {
  assert.ok(containsForbiddenContent('Gagnez au casino maintenant').blocked);
  assert.ok(containsForbiddenContent('lien bit.ly/abc').blocked);
  assert.ok(!containsForbiddenContent('Quel éducateur recommandez-vous à Lorient ?').blocked);
});

test('validatePostInput : rejette contenu court ou interdit', () => {
  assert.ok(validatePostInput({ circleId: 'lorient', type: 'discussion', content: 'ok' }).some((e) => /court/.test(e)));
  assert.ok(validatePostInput({ circleId: 'lorient', type: 'discussion', content: 'Venez au casino bit.ly/x' }).some((e) => /non autorisé/i.test(e)));
  assert.deepEqual(validatePostInput({ circleId: 'lorient', type: 'question', content: 'Une vraie question utile ?' }), []);
});

test('validateEventInput : refuse une date passée, accepte le futur', () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.ok(validateEventInput({ circleId: 'lorient', type: 'balade', title: 'Balade', startsAt: past, meetingPointName: 'Port', lat: 47.7, lon: -3.3 }).some((e) => /futur/i.test(e)));
  assert.deepEqual(
    validateEventInput({ circleId: 'lorient', type: 'balade', title: 'Balade au golfe', startsAt: future, meetingPointName: 'Port', lat: 47.7, lon: -3.3 }),
    [],
  );
});

test('buildPost / buildEvent : valeurs initiales saines', () => {
  const p = buildPost({ circleId: 'lorient', type: 'discussion', content: 'Bonjour la veute' });
  assert.equal(p.flagCount, 0);
  assert.equal(p.isHidden, false);
  assert.deepEqual(p.replies, []);
  const e = buildEvent({ circleId: 'lorient', type: 'balade', title: 'Sortie', startsAt: new Date(Date.now() + 86_400_000).toISOString(), meetingPointName: 'Port', lat: 47.7, lon: -3.3 });
  assert.equal(e.participants, 1);
  assert.equal(e.myStatus, 'going');
});

test('validateEventInput : rejette coordonnees non finies ou hors Bretagne', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.ok(validateEventInput({ circleId: 'lorient', type: 'balade', title: 'Balade', startsAt: future, meetingPointName: 'Port', lat: Number.NaN, lon: -3.3 }).some((e) => /coordonnees/i.test(e)));
  assert.ok(validateEventInput({ circleId: 'lorient', type: 'balade', title: 'Balade', startsAt: future, meetingPointName: 'Port', lat: 51, lon: -3.3 }).some((e) => /Latitude/i.test(e)));
});

test('buildEvent : arrondit les coordonnees publiques de rendez-vous', () => {
  const e = buildEvent({ circleId: 'lorient', type: 'balade', title: 'Sortie', startsAt: new Date(Date.now() + 86_400_000).toISOString(), meetingPointName: 'Port', lat: 47.726789, lon: -3.367891 });
  assert.equal(e.lat, publicCommunityCoordinate(47.726789));
  assert.equal(e.lon, publicCommunityCoordinate(-3.367891));
  assert.equal(e.lat, 47.73);
  assert.equal(e.lon, -3.37);
});