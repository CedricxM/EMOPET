import assert from 'node:assert/strict';
import test from 'node:test';
import { MOCK_BRITTANY_TERRITORIES } from '../mockTerritories';
import { computeLaunchScore, rankTerritories } from '../territoryScoring';

test('territory scoring returns bounded launch scores for Brittany mocks', () => {
  const ranked = rankTerritories(MOCK_BRITTANY_TERRITORIES);
  assert.equal(ranked.length, 5);
  for (const territory of ranked) {
    assert.ok(territory.launch_score >= 0);
    assert.ok(territory.launch_score <= 100);
    assert.ok(territory.score_breakdown.canine_ecosystem_density >= 0);
  }
});

test('territory scoring weights are configurable', () => {
  const territory = MOCK_BRITTANY_TERRITORIES[0]!;
  const defaultScore = computeLaunchScore(territory);
  const communityWeightedScore = computeLaunchScore(territory, {
    weights: {
      population_density_potential: 0.05,
      canine_ecosystem_density: 0.1,
      purchasing_power: 0.05,
      housing_lifestyle_compatibility: 0.05,
      tourism_mobility: 0.05,
      community_potential: 0.6,
      heritage_local_identity: 0.1,
    },
  });
  assert.notEqual(defaultScore, communityWeightedScore);
});
