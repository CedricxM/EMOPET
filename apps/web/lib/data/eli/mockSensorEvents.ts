import type { AppObservationEvent } from './appObservation.schema';
import type { DogProfile } from './dogProfile.schema';
import type { MatEvent } from './matEvent.schema';
import type { TagEvent } from './tagEvent.schema';

export const MOCK_DOG_PROFILE: DogProfile = {
  dog_id: 'dog-gus',
  name: 'Gus',
  breed_id_optional: 'fci-297',
  breed_name_optional: 'Border Collie',
  fci_group_optional: '1',
  age_optional: 4,
  sex_optional: 'male',
  weight_kg_optional: 18,
  size_category_optional: 'medium',
  coat_type_optional: 'double_long',
  coat_length_optional: 'long',
  morphology_notes_optional: null,
  owner_provided_notes_optional: null,
};

export const MOCK_MAT_EVENTS: MatEvent[] = [
  {
    dog_id: 'dog-gus',
    timestamp: '2026-06-13T07:30:00.000Z',
    rest_window_id: 'rest-window-001',
    respiration_proxy: 0.42,
    micro_movement_level: 0.18,
    position_stability: 0.88,
    load_cell_presence: true,
    signal_quality: 0.86,
    textile_coupling_quality: 0.82,
    data_validity_status: 'valid',
  },
];

export const MOCK_TAG_EVENTS: TagEvent[] = [
  {
    dog_id: 'dog-gus',
    timestamp: '2026-06-13T07:30:00.000Z',
    activity_level: 0.22,
    posture_proxy: 'lying_reference',
    movement_pattern: 'low_movement_window',
    location_context: 'home',
    vocalization_event: false,
    microphone_quality: 0.76,
    battery_status: 0.91,
    signal_quality: 0.79,
  },
];

export const MOCK_APP_OBSERVATIONS: AppObservationEvent[] = [
  {
    dog_id: 'dog-gus',
    timestamp: '2026-06-13T07:35:00.000Z',
    owner_note: 'MAT placement checked before the morning routine.',
    context_tag: 'rest_setup',
    walk_added: false,
    calm_place_discovered: false,
    educational_tip_read: true,
    professional_observation_optional: null,
  },
];

export const LOW_QUALITY_MAT_EVENTS: MatEvent[] = [
  {
    ...MOCK_MAT_EVENTS[0]!,
    rest_window_id: 'rest-window-low-quality',
    signal_quality: 0.22,
    textile_coupling_quality: 0.21,
    data_validity_status: 'insufficient',
  },
];
