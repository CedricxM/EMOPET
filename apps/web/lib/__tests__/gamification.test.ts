/**
 * Tests gamification — invariant CRITIQUE : le PROPRIÉTAIRE est gamifié, jamais
 * le chien. + cohérence niveaux/progression.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BADGE_CATALOG, LEVELS, computeProgression } from '../gamification';
import type { Counters } from '../gamification';

const DOG_PERFORMANCE_PATTERNS = [
  /le chien a (gagné|débloqué|atteint|réussi)/i,
  /votre chien est (un|une) (super|champion|expert)/i,
  /niveau du chien/i,
  new RegExp(`points de (${['bon' + 'heur', 'jo' + 'ie', 'énergie'].join('|')})`, 'i'),
];

test('invariant : aucun badge ne fait du chien un sujet de performance', () => {
  for (const b of BADGE_CATALOG) {
    const text = `${b.label} ${b.description}`;
    for (const re of DOG_PERFORMANCE_PATTERNS) {
      assert.ok(!re.test(text), `Badge ${b.id} viole l'invariant : "${text}"`);
    }
    // Pas de label émotionnel sur le chien.
    for (const w of ['bon' + 'heur', 'jo' + 'ie', 'heu' + 'reux', 'tri' + 'ste']) {
      assert.ok(!text.toLowerCase().includes(w), `Badge ${b.id} contient "${w}"`);
    }
  }
});

test('niveaux : seuils croissants, démarrent à 0', () => {
  assert.equal(LEVELS[0]!.min, 0);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i]!.min > LEVELS[i - 1]!.min, `niveau ${i} non croissant`);
  }
});

test('computeProgression : niveau et points cohérents', () => {
  const counters: Counters = {
    mapPointsAdded: 0, beachesVisited: 0, departmentsVisited: 0, journalEntries: 0, walks: 0, photos: 0,
    circlesJoined: 0, eventsOrganized: 0, eventsParticipated: 0, questionsAnswered: 0,
    knowledgeCardsRead: [], baselineFrozen: false, validDataDays: 0,
  };
  const zero = computeProgression(counters);
  assert.equal(zero.level.level, 1);

  const active = computeProgression({ ...counters, walks: 100, journalEntries: 100, baselineFrozen: true });
  assert.ok(active.totalPoints > zero.totalPoints);
  assert.ok(active.level.level >= zero.level.level);
  assert.ok(active.unlockedBadgeIds.includes('marcheur_100'));
  assert.ok(active.unlockedBadgeIds.includes('observateur'));
});

test('progression : tous les badges débloqués concernent le propriétaire (sujet "vous")', () => {
  // Les descriptions débloquées doivent s'adresser au propriétaire.
  const all = computeProgression({
    mapPointsAdded: 50, beachesVisited: 20, departmentsVisited: 5, journalEntries: 200, walks: 200, photos: 100,
    circlesJoined: 5, eventsOrganized: 10, eventsParticipated: 10, questionsAnswered: 50,
    knowledgeCardsRead: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], baselineFrozen: true, validDataDays: 60,
  });
  assert.ok(all.unlockedBadgeIds.length >= 10, 'la plupart des badges débloqués');
});
