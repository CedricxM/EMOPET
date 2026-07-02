export type DataValidityStatus = 'valid' | 'partial' | 'insufficient' | 'rejected';

export interface MatEvent {
  dog_id: string;
  timestamp: string;
  rest_window_id: string;
  respiration_proxy: number | null;
  micro_movement_level: number | null;
  position_stability: number;
  load_cell_presence: boolean;
  signal_quality: number;
  textile_coupling_quality: number;
  data_validity_status: DataValidityStatus;
}

function isUnitInterval(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isOptionalFinite(value: number | null): boolean {
  return value == null || (typeof value === 'number' && Number.isFinite(value));
}

export function validateMatEvent(event: MatEvent): string[] {
  const errors: string[] = [];
  if (!event.dog_id.trim()) errors.push('dog_id is required');
  if (!event.timestamp.trim() || Number.isNaN(new Date(event.timestamp).getTime())) errors.push('timestamp is invalid');
  if (!event.rest_window_id.trim()) errors.push('rest_window_id is required');
  if (!isOptionalFinite(event.respiration_proxy)) errors.push('respiration_proxy must be finite when present');
  if (!isOptionalFinite(event.micro_movement_level)) errors.push('micro_movement_level must be finite when present');
  for (const key of ['position_stability', 'signal_quality', 'textile_coupling_quality'] as const) {
    if (!isUnitInterval(event[key])) errors.push(`${key} must be between 0 and 1`);
  }
  return errors;
}
