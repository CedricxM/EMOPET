import type {
  ScoredTerritory,
  TerritoryRecord,
  TerritoryScoreBreakdown,
  TerritoryScoringWeights,
} from './territory.schema';

export const DEFAULT_TERRITORY_SCORING_WEIGHTS: TerritoryScoringWeights = {
  population_density_potential: 0.25,
  canine_ecosystem_density: 0.2,
  purchasing_power: 0.15,
  housing_lifestyle_compatibility: 0.15,
  tourism_mobility: 0.1,
  community_potential: 0.1,
  heritage_local_identity: 0.05,
};

export interface TerritoryScoringOptions {
  weights?: TerritoryScoringWeights;
  maxPopulation?: number;
  maxDensity?: number;
  maxMedianIncome?: number;
  maxCanineActorsPer10k?: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function actorCount(record: TerritoryRecord): number {
  return (
    record.number_of_veterinarians +
    record.number_of_dog_trainers +
    record.number_of_groomers +
    record.number_of_shelters +
    record.number_of_dog_clubs +
    record.number_of_pet_services
  );
}

export function normalizeWeights(weights: TerritoryScoringWeights): TerritoryScoringWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return DEFAULT_TERRITORY_SCORING_WEIGHTS;
  return {
    population_density_potential: weights.population_density_potential / total,
    canine_ecosystem_density: weights.canine_ecosystem_density / total,
    purchasing_power: weights.purchasing_power / total,
    housing_lifestyle_compatibility: weights.housing_lifestyle_compatibility / total,
    tourism_mobility: weights.tourism_mobility / total,
    community_potential: weights.community_potential / total,
    heritage_local_identity: weights.heritage_local_identity / total,
  };
}

export function computeTerritoryScoreBreakdown(
  record: TerritoryRecord,
  options: TerritoryScoringOptions = {},
): TerritoryScoreBreakdown {
  const maxPopulation = options.maxPopulation ?? 250_000;
  const maxDensity = options.maxDensity ?? 5_000;
  const maxMedianIncome = options.maxMedianIncome ?? 36_000;
  const maxCanineActorsPer10k = options.maxCanineActorsPer10k ?? 7;

  const populationPotential = clamp01(record.population / maxPopulation);
  const densityPotential = 1 - Math.abs(clamp01(record.density / maxDensity) - 0.45);
  const canineActorsPer10k = record.population > 0 ? (actorCount(record) / record.population) * 10_000 : 0;

  return {
    population_density_potential: roundScore(((populationPotential * 0.62) + (densityPotential * 0.38)) * 100),
    canine_ecosystem_density: roundScore(clamp01(canineActorsPer10k / maxCanineActorsPer10k) * 100),
    purchasing_power: roundScore(clamp01(record.median_income / maxMedianIncome) * 100),
    housing_lifestyle_compatibility: roundScore(clamp01(record.housing_with_garden_ratio) * 100),
    tourism_mobility: roundScore(clamp01(record.tourism_score / 100) * 100),
    community_potential: roundScore(clamp01(record.community_potential_score / 100) * 100),
    heritage_local_identity: roundScore(clamp01(record.heritage_score / 100) * 100),
  };
}

export function computeLaunchScore(record: TerritoryRecord, options: TerritoryScoringOptions = {}): number {
  const weights = normalizeWeights(options.weights ?? DEFAULT_TERRITORY_SCORING_WEIGHTS);
  const breakdown = computeTerritoryScoreBreakdown(record, options);
  const score =
    breakdown.population_density_potential * weights.population_density_potential +
    breakdown.canine_ecosystem_density * weights.canine_ecosystem_density +
    breakdown.purchasing_power * weights.purchasing_power +
    breakdown.housing_lifestyle_compatibility * weights.housing_lifestyle_compatibility +
    breakdown.tourism_mobility * weights.tourism_mobility +
    breakdown.community_potential * weights.community_potential +
    breakdown.heritage_local_identity * weights.heritage_local_identity;

  return roundScore(score);
}

export function scoreTerritory(record: TerritoryRecord, options: TerritoryScoringOptions = {}): ScoredTerritory {
  return {
    ...record,
    launch_score: computeLaunchScore(record, options),
    score_breakdown: computeTerritoryScoreBreakdown(record, options),
  };
}

export function rankTerritories(records: TerritoryRecord[], options: TerritoryScoringOptions = {}): ScoredTerritory[] {
  return records
    .map((record) => scoreTerritory(record, options))
    .sort((a, b) => b.launch_score - a.launch_score || a.commune.localeCompare(b.commune));
}
