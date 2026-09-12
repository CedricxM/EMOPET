/**
 * Doctrine tests for the legacy gamification compatibility layer.
 *
 * Global progression is intentionally neutral under #233. Real-dog activity,
 * distance, MAT/TAG/ELI state and data adherence must not create rewards.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BADGE_CATALOG, CHALLENGES, LEVELS, computeProgression } from '../gamification';
import type { Counters } from '../gamification';

const EMPTY: Counters = {
  mapPointsAdded: 0,
  beachesVisited: 0,
  departmentsVisited: 0,
  journalEntries: 0,
  walks: 0,
  photos: 0,
  circlesJoined: 0,
  eventsOrganized: 0,
  eventsParticipated: 0,
  questionsAnswered: 0,
  knowledgeCardsRead: [],
  baselineFrozen: false,
  validDataDays: 0,
};

test('global badge and challenge catalogs are disabled', () => {
  assert.deepEqual(BADGE_CATALOG, []);
  assert.deepEqual(CHALLENGES, []);
});

test('legacy progression has one neutral state and no unlocks', () => {
  assert.equal(LEVELS.length, 1);
  assert.equal(LEVELS[0]!.level, 0);
  assert.equal(LEVELS[0]!.min, 0);

  const result = computeProgression(EMPTY);
  assert.equal(result.totalPoints, 0);
  assert.equal(result.level.level, 0);
  assert.equal(result.nextLevel, null);
  assert.deepEqual(result.unlockedBadgeIds, []);
});

test('dog activity and MAT/data adherence cannot change progression', () => {
  const baseline = computeProgression(EMPTY);
  const highDogActivity = computeProgression({
    ...EMPTY,
    walks: 10_000,
    photos: 5_000,
    baselineFrozen: true,
    validDataDays: 365,
  });

  assert.deepEqual(highDogActivity, baseline);
});

test('community, journal and learning volume also cannot create global rank', () => {
  const baseline = computeProgression(EMPTY);
  const highEngagement = computeProgression({
    ...EMPTY,
    mapPointsAdded: 500,
    journalEntries: 500,
    circlesJoined: 50,
    eventsOrganized: 100,
    eventsParticipated: 100,
    questionsAnswered: 1_000,
    knowledgeCardsRead: ['a', 'b', 'c', 'd'],
  });

  assert.deepEqual(highEngagement, baseline);
});
