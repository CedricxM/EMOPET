/**
 * Tests des adaptateurs cœur (lot 2b) — purs : normalisation + mocks.
 * Calendrier (Nager.Date), races (dog.ceo), traduction (LibreTranslate),
 * validation email (Disify), modération (PurgoMalum). Aucun appel réseau.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as nager from '../nagerDate';
import * as dog from '../dogCeo';
import * as lt from '../libreTranslate';
import * as disify from '../disify';
import * as purgo from '../purgoMalum';
import { ProviderInvalidResponseError } from '../../errors';

// ── Nager.Date ───────────────────────────────────────────────────────────────
test('nager: normalizeHolidays, weekday, routine (férié/week-end)', () => {
  const hs = nager.normalizeHolidays([{ date: '2026-07-14', localName: 'Fête nationale', name: 'Bastille Day' }, { name: 'sans date' }]);
  assert.equal(hs.length, 1);
  const wi = nager.weekdayInfo('2026-07-14');
  assert.equal(wi.weekday, 2); // mardi
  assert.equal(wi.isWeekend, false);
  const r = nager.routineFrom('2026-07-14', hs);
  assert.equal(r.isHoliday, true);
  assert.equal(r.holidayName, 'Fête nationale');
  assert.equal(nager.routineFrom('2026-07-15', hs).isHoliday, false);
  assert.equal(nager.weekdayInfo('2026-07-12').isWeekend, true); // dimanche
  assert.equal(nager.mockResponse()[0]?.category, 'calendar');
});

// ── dog.ceo ──────────────────────────────────────────────────────────────────
test('dog: slug, normalizeImages, liste filtrée', () => {
  assert.equal(dog.breedSlug('Labrador Retriever'), 'labrador');
  const s = dog.normalizeImages('labrador', { status: 'success', message: ['a.jpg', 'b.jpg'] });
  assert.equal(s.category, 'dog_knowledge');
  assert.equal(s.value.images.length, 2);
  assert.throws(() => dog.normalizeImages('x', { status: 'error', message: [] }), ProviderInvalidResponseError);
  const list = dog.normalizeBreedList('retriever', { message: { retriever: ['golden', 'chesapeake'], hound: ['afghan'] } });
  assert.ok(list.value.breeds.includes('retriever'));
  assert.ok(list.value.breeds.some((b) => b.includes('retriever')));
  assert.ok(!list.value.breeds.includes('hound'));
});

// ── LibreTranslate ───────────────────────────────────────────────────────────
test('libretranslate: normalizeDetect ramène la confiance en 0..1', () => {
  const s = lt.normalizeDetect([{ language: 'fr', confidence: 92 }, { language: 'en', confidence: 5 }]);
  assert.equal(s.value.language, 'fr');
  assert.ok(s.value.confidence > 0.9 && s.value.confidence <= 1);
  assert.equal(s.sourceType, 'modeled');
  assert.throws(() => lt.normalizeDetect([]), ProviderInvalidResponseError);
  assert.equal(lt.mockResponse()[0]?.category, 'translation');
});

// ── Disify (email) ───────────────────────────────────────────────────────────
test('disify: riskFrom et normalizeDisify', () => {
  assert.equal(disify.riskFrom({ disposable: true }), 'high');
  assert.equal(disify.riskFrom({ format: false }), 'high');
  assert.equal(disify.riskFrom({ dns: false }), 'high');
  assert.equal(disify.riskFrom({ format: true, disposable: false, dns: true }), 'low');
  const s = disify.normalizeDisify('a@b.com', { format: true, disposable: true, dns: true });
  assert.equal(s.category, 'email_validation');
  assert.equal(s.value.risk, 'high');
  assert.equal(disify.mockResponse()[0]?.category, 'email_validation');
});

// ── PurgoMalum (modération) ──────────────────────────────────────────────────
test('purgomalum: clean si texte inchangé, sinon signalé', () => {
  const clean = purgo.normalizeModeration('hello world', { result: 'hello world' });
  assert.equal(clean.value.clean, true);
  const dirty = purgo.normalizeModeration('foo bar', { result: 'foo ***' });
  assert.equal(dirty.value.clean, false);
  assert.equal(dirty.value.sanitized, 'foo ***');
  assert.equal(purgo.mockResponse()[0]?.category, 'moderation');
});
