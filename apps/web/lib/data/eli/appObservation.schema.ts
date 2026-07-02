export interface AppObservationEvent {
  dog_id: string;
  timestamp: string;
  owner_note: string | null;
  context_tag: 'rest_setup' | 'walk' | 'local_place' | 'learning' | 'professional_note' | 'other';
  walk_added: boolean;
  calm_place_discovered: boolean;
  educational_tip_read: boolean;
  professional_observation_optional: string | null;
}

export function validateAppObservationEvent(event: AppObservationEvent): string[] {
  const errors: string[] = [];
  if (!event.dog_id.trim()) errors.push('dog_id is required');
  if (!event.timestamp.trim()) errors.push('timestamp is required');
  if (event.owner_note && event.owner_note.length > 1_000) errors.push('owner_note is too long');
  if (event.professional_observation_optional && event.professional_observation_optional.length > 1_000) {
    errors.push('professional_observation_optional is too long');
  }
  return errors;
}
