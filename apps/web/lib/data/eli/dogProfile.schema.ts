export interface DogProfile {
  dog_id: string;
  name: string;
  breed_id_optional: string | null;
  breed_name_optional: string | null;
  fci_group_optional: string | null;
  age_optional: number | null;
  sex_optional: 'female' | 'male' | 'unknown' | null;
  weight_kg_optional: number | null;
  size_category_optional: 'toy' | 'small' | 'medium' | 'large' | 'giant' | null;
  coat_type_optional: 'smooth' | 'short' | 'long' | 'wiry' | 'curly' | 'double_short' | 'double_long' | null;
  coat_length_optional: 'short' | 'medium' | 'long' | null;
  morphology_notes_optional: string | null;
  owner_provided_notes_optional: string | null;
}

export type SignalConstraintNote =
  | 'possible_fur_related_signal_damping'
  | 'size_requires_mat_variant_check'
  | 'morphology_requires_positioning_validation'
  | 'no_constraint_known';

export interface SignalConstraintEstimate {
  dog_id: string;
  notes: SignalConstraintNote[];
  explanation: string;
}

export function estimateSignalConstraintsFromDogProfile(profile: DogProfile): SignalConstraintEstimate {
  const notes = new Set<SignalConstraintNote>();
  if (
    profile.coat_length_optional === 'long' ||
    profile.coat_type_optional === 'double_long' ||
    profile.coat_type_optional === 'wiry' ||
    profile.coat_type_optional === 'curly'
  ) {
    notes.add('possible_fur_related_signal_damping');
  }
  if (profile.size_category_optional === 'toy' || profile.size_category_optional === 'giant') {
    notes.add('size_requires_mat_variant_check');
  }
  if (profile.morphology_notes_optional && profile.morphology_notes_optional.trim().length > 0) {
    notes.add('morphology_requires_positioning_validation');
  }
  if (notes.size === 0) notes.add('no_constraint_known');

  return {
    dog_id: profile.dog_id,
    notes: [...notes],
    explanation:
      'Profile metadata is used for onboarding, cohort grouping and sensor-quality checks only. It does not assign internal state labels.',
  };
}
