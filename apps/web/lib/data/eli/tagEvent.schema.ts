export interface TagEvent {
  dog_id: string;
  timestamp: string;
  activity_level: number;
  posture_proxy: string | null;
  movement_pattern: string | null;
  location_context: 'home' | 'walk' | 'vehicle' | 'unknown';
  vocalization_event: boolean;
  microphone_quality: number;
  battery_status: number;
  signal_quality: number;
}

function isUnitInterval(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateTagEvent(event: TagEvent): string[] {
  const errors: string[] = [];
  if (!event.dog_id.trim()) errors.push('dog_id is required');
  if (!event.timestamp.trim() || Number.isNaN(new Date(event.timestamp).getTime())) errors.push('timestamp is invalid');
  for (const key of ['activity_level', 'microphone_quality', 'battery_status', 'signal_quality'] as const) {
    if (!isUnitInterval(event[key])) errors.push(`${key} must be between 0 and 1`);
  }
  return errors;
}
