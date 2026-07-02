import type { DogProfile } from '../eli/dogProfile.schema';
import type { FciBreed } from './fciBreed.schema';

const DOG_PROFILE_COAT_TYPES = new Set<NonNullable<DogProfile['coat_type_optional']>>([
  'smooth',
  'short',
  'long',
  'wiry',
  'curly',
  'double_short',
  'double_long',
]);

export interface DogProfileDraftInput {
  dog_id: string;
  name: string;
  breed: FciBreed | null;
  age_optional?: number | null;
  sex_optional?: DogProfile['sex_optional'];
  weight_kg_optional?: number | null;
  owner_provided_notes_optional?: string | null;
}

function normalizeCoatType(value: string | null): DogProfile['coat_type_optional'] {
  if (!value) return null;
  return DOG_PROFILE_COAT_TYPES.has(value as NonNullable<DogProfile['coat_type_optional']>)
    ? (value as NonNullable<DogProfile['coat_type_optional']>)
    : null;
}

export function createDogProfileFromFciBreed(input: DogProfileDraftInput): DogProfile {
  const breedName = input.breed?.breed_name_fr ?? input.breed?.breed_name_original ?? null;
  const group = input.breed?.group_number != null
    ? `FCI group ${input.breed.group_number}${input.breed.group_name ? ` - ${input.breed.group_name}` : ''}`
    : null;

  return {
    dog_id: input.dog_id,
    name: input.name,
    breed_id_optional: input.breed?.id ?? null,
    breed_name_optional: breedName,
    fci_group_optional: group,
    age_optional: input.age_optional ?? null,
    sex_optional: input.sex_optional ?? null,
    weight_kg_optional: input.weight_kg_optional ?? null,
    size_category_optional: input.breed?.size_category_optional ?? null,
    coat_type_optional: normalizeCoatType(input.breed?.coat_type_optional ?? null),
    coat_length_optional: input.breed?.coat_length_optional ?? null,
    morphology_notes_optional: input.breed?.morphology_notes_optional ?? null,
    owner_provided_notes_optional: input.owner_provided_notes_optional ?? null,
  };
}
