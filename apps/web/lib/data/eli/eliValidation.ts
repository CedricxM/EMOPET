import type { AppObservationEvent } from './appObservation.schema';
import { validateAppObservationEvent } from './appObservation.schema';
import type { DogProfile, SignalConstraintEstimate } from './dogProfile.schema';
import { estimateSignalConstraintsFromDogProfile } from './dogProfile.schema';
import type { ObservableSituationLabel } from './eliLabels';
import type { MatEvent } from './matEvent.schema';
import { validateMatEvent } from './matEvent.schema';
import type { TagEvent } from './tagEvent.schema';
import { validateTagEvent } from './tagEvent.schema';

export interface EliValidationInput {
  profile?: DogProfile | null;
  mat_events: MatEvent[];
  tag_events: TagEvent[];
  app_observations: AppObservationEvent[];
}

export interface EliValidationResult {
  status: 'valid_for_mock_output' | 'insufficient_data' | 'invalid_input';
  labels: ObservableSituationLabel[];
  confidence: number;
  errors: string[];
  signal_constraints: SignalConstraintEstimate | null;
}

export interface EliQualityThresholds {
  minMatSignalQuality: number;
  minTagSignalQuality: number;
  minTextileCouplingQuality: number;
  minMatEvents: number;
  minTagEvents: number;
}

export const DEFAULT_ELI_QUALITY_THRESHOLDS: EliQualityThresholds = {
  minMatSignalQuality: 0.62,
  minTagSignalQuality: 0.58,
  minTextileCouplingQuality: 0.55,
  minMatEvents: 1,
  minTagEvents: 1,
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function validateEliInput(
  input: EliValidationInput,
  thresholds: EliQualityThresholds = DEFAULT_ELI_QUALITY_THRESHOLDS,
): EliValidationResult {
  const errors = [
    ...input.mat_events.flatMap((event) => validateMatEvent(event)),
    ...input.tag_events.flatMap((event) => validateTagEvent(event)),
    ...input.app_observations.flatMap((event) => validateAppObservationEvent(event)),
  ];

  const signalConstraints = input.profile ? estimateSignalConstraintsFromDogProfile(input.profile) : null;
  if (errors.length > 0) {
    return {
      status: 'invalid_input',
      labels: ['insufficient_data'],
      confidence: 0,
      errors,
      signal_constraints: signalConstraints,
    };
  }

  const avgMatSignal = average(input.mat_events.map((event) => event.signal_quality));
  const avgTagSignal = average(input.tag_events.map((event) => event.signal_quality));
  const avgTextileCoupling = average(input.mat_events.map((event) => event.textile_coupling_quality));
  const labels: ObservableSituationLabel[] = [];

  if (
    input.mat_events.length < thresholds.minMatEvents ||
    input.tag_events.length < thresholds.minTagEvents ||
    avgMatSignal < thresholds.minMatSignalQuality ||
    avgTagSignal < thresholds.minTagSignalQuality ||
    avgTextileCoupling < thresholds.minTextileCouplingQuality
  ) {
    labels.push('insufficient_data');
    if (avgMatSignal < thresholds.minMatSignalQuality || avgTagSignal < thresholds.minTagSignalQuality) {
      labels.push('signal_quality_low');
    }
    return {
      status: 'insufficient_data',
      labels,
      confidence: Math.round(Math.min(avgMatSignal, avgTagSignal, avgTextileCoupling) * 100),
      errors: [],
      signal_constraints: signalConstraints,
    };
  }

  labels.push('reliable_rest_window_completed');
  if (input.app_observations.some((event) => event.context_tag === 'walk' && event.walk_added)) {
    labels.push('context_needed');
  }

  return {
    status: 'valid_for_mock_output',
    labels,
    confidence: Math.round(((avgMatSignal + avgTagSignal + avgTextileCoupling) / 3) * 100),
    errors: [],
    signal_constraints: signalConstraints,
  };
}
