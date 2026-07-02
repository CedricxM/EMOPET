import assert from 'node:assert/strict';
import test from 'node:test';
import { ingestFciBreedsFromCsvContent } from '../ingestFciBreeds';
import { MOCK_FCI_BREEDS } from '../mockFciBreeds';
import { searchFciBreeds } from '../fciBreedSearch';
import { createDogProfileFromFciBreed } from '../fciToDogProfile';
import { estimateSignalConstraintsFromDogProfile } from '../../eli/dogProfile.schema';
import { createDogProfileFromFciSelection } from '../../use-cases/dogProfileLocalMapFlow';

test('FCI CSV ingestion accepts the local controlled CSV shape', () => {
  const csv = [
    'fci_group,name,country_origin,size_class',
    '1,Beagle,Royaume-Uni,Moyenne',
    '5,Shiba Inu,Japon,Petite',
  ].join('\n');
  const result = ingestFciBreedsFromCsvContent(csv, 'inline.csv');
  assert.equal(result.rejected.length, 0);
  assert.equal(result.breeds.length, 2);
  assert.equal(result.breeds[0]!.group_number, 1);
  assert.equal(result.breeds[0]!.size_category_optional, 'medium');
});

test('FCI breed search finds local breed references without deterministic traits', () => {
  const results = searchFciBreeds('border', MOCK_FCI_BREEDS);
  assert.equal(results[0]?.breed_name_original, 'Border Collie');
  assert.equal(results[0]?.group_number, 1);
});

test('combined FCI and local map flow creates profile and public markers', () => {
  const flow = createDogProfileFromFciSelection({
    dog_id: 'dog-1',
    name: 'Gus',
    selected_breed_id: 'fci-297',
    include_opt_in_local_contributions: false,
  });
  assert.equal(flow.profile.breed_id_optional, 'fci-297');
  assert.ok(flow.local_markers.every((marker) => marker.privacy_level === 'public'));
  assert.ok(flow.suggested_contribution.includes('quiet walking spot'));
});

test('FCI breed mapping creates DogProfile metadata without behavioural shortcuts', () => {
  const profile = createDogProfileFromFciBreed({
    dog_id: 'dog-1',
    name: 'Gus',
    breed: MOCK_FCI_BREEDS[0]!,
    age_optional: 4,
    sex_optional: 'unknown',
    weight_kg_optional: 18,
  });

  assert.equal(profile.breed_id_optional, MOCK_FCI_BREEDS[0]!.id);
  assert.equal(profile.fci_group_optional, 'FCI group 1 - Sheepdogs and Cattle Dogs');
  assert.equal(profile.coat_type_optional, 'double_long');
  assert.ok(!('personality' in profile));
  assert.ok(!('emotion' in profile));

  const constraints = estimateSignalConstraintsFromDogProfile(profile);
  assert.ok(constraints.notes.includes('possible_fur_related_signal_damping'));
  assert.ok(!constraints.notes.some((note) => note.includes('emotion')));
});
