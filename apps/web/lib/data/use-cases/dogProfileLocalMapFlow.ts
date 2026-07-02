import type { DogProfile } from '../eli/dogProfile.schema';
import { estimateSignalConstraintsFromDogProfile } from '../eli/dogProfile.schema';
import type { FciBreed } from '../fci/fciBreed.schema';
import { findFciBreedById } from '../fci/fciBreedSearch';
import { createDogProfileFromFciBreed } from '../fci/fciToDogProfile';
import { MOCK_FCI_BREEDS } from '../fci/mockFciBreeds';
import { MOCK_MAP_PLACES } from '../mapbox/mockMapEntities';
import { filterPublicOrOptInMarkers } from '../mapbox/mapboxMarkers';
import type { MapMarkerDescriptor } from '../mapbox/mapbox.schema';

export interface DogProfileLocalMapFlowInput {
  dog_id: string;
  name: string;
  selected_breed_id: string;
  include_opt_in_local_contributions: boolean;
}

export interface DogProfileLocalMapFlow {
  profile: DogProfile;
  breed: FciBreed | null;
  signal_notes: ReturnType<typeof estimateSignalConstraintsFromDogProfile>;
  local_markers: MapMarkerDescriptor[];
  suggested_contribution: string;
}

export function createDogProfileFromFciSelection(
  input: DogProfileLocalMapFlowInput,
  breeds: FciBreed[] = MOCK_FCI_BREEDS,
): DogProfileLocalMapFlow {
  const breed = findFciBreedById(input.selected_breed_id, breeds);
  const profile: DogProfile = createDogProfileFromFciBreed({
    dog_id: input.dog_id,
    name: input.name,
    breed,
  });

  return {
    profile,
    breed,
    signal_notes: estimateSignalConstraintsFromDogProfile(profile),
    local_markers: filterPublicOrOptInMarkers(MOCK_MAP_PLACES, input.include_opt_in_local_contributions),
    suggested_contribution: 'Add a quiet walking spot or update a dog-friendly place after opt-in.',
  };
}
