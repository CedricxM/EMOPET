export type ObservableSituationLabel =
  | 'reliable_rest_window_completed'
  | 'signal_quality_low'
  | 'routine_change_detected'
  | 'activity_unusual_for_context'
  | 'rest_pattern_shift'
  | 'vocalization_frequency_change'
  | 'insufficient_data'
  | 'context_needed';

export const OBSERVABLE_SITUATION_LABELS: ObservableSituationLabel[] = [
  'reliable_rest_window_completed',
  'signal_quality_low',
  'routine_change_detected',
  'activity_unusual_for_context',
  'rest_pattern_shift',
  'vocalization_frequency_change',
  'insufficient_data',
  'context_needed',
];
