export type UrbanRuralType = 'urban' | 'periurban' | 'coastal' | 'rural' | 'mixed';

export interface TerritoryRecord {
  code_insee: string;
  commune: string;
  department: string;
  region: string;
  population: number;
  density: number;
  median_income: number;
  housing_with_garden_ratio: number;
  urban_rural_type: UrbanRuralType;
  tourism_score: number;
  number_of_veterinarians: number;
  number_of_dog_trainers: number;
  number_of_groomers: number;
  number_of_shelters: number;
  number_of_dog_clubs: number;
  number_of_pet_services: number;
  heritage_score: number;
  community_potential_score: number;
  launch_score?: number;
}

export interface TerritoryScoreBreakdown {
  population_density_potential: number;
  canine_ecosystem_density: number;
  purchasing_power: number;
  housing_lifestyle_compatibility: number;
  tourism_mobility: number;
  community_potential: number;
  heritage_local_identity: number;
}

export interface TerritoryScoringWeights {
  population_density_potential: number;
  canine_ecosystem_density: number;
  purchasing_power: number;
  housing_lifestyle_compatibility: number;
  tourism_mobility: number;
  community_potential: number;
  heritage_local_identity: number;
}

export interface ScoredTerritory extends TerritoryRecord {
  launch_score: number;
  score_breakdown: TerritoryScoreBreakdown;
}

export function validateTerritoryRecord(record: TerritoryRecord): string[] {
  const errors: string[] = [];
  if (!record.code_insee.trim()) errors.push('code_insee is required');
  if (!record.commune.trim()) errors.push('commune is required');
  if (!record.department.trim()) errors.push('department is required');
  if (!record.region.trim()) errors.push('region is required');
  for (const key of [
    'population',
    'density',
    'median_income',
    'housing_with_garden_ratio',
    'tourism_score',
    'number_of_veterinarians',
    'number_of_dog_trainers',
    'number_of_groomers',
    'number_of_shelters',
    'number_of_dog_clubs',
    'number_of_pet_services',
    'heritage_score',
    'community_potential_score',
  ] as const) {
    if (!Number.isFinite(record[key])) errors.push(`${key} must be numeric`);
  }
  if (record.housing_with_garden_ratio < 0 || record.housing_with_garden_ratio > 1) {
    errors.push('housing_with_garden_ratio must be between 0 and 1');
  }
  return errors;
}
