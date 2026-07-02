import type { EliValidationInput } from './eliValidation';
import { validateEliInput } from './eliValidation';

export interface MockEliOutput {
  validated: false;
  status: 'mock_output' | 'insufficient_data' | 'invalid_input';
  confidence: number;
  labels: string[];
  explanation: string;
}

export function runMockEliPipeline(input: EliValidationInput): MockEliOutput {
  const validation = validateEliInput(input);
  if (validation.status !== 'valid_for_mock_output') {
    return {
      validated: false,
      status: validation.status,
      confidence: validation.confidence,
      labels: validation.labels,
      explanation: 'No output is produced when data quality is too low or input validation fails.',
    };
  }

  return {
    validated: false,
    status: 'mock_output',
    confidence: validation.confidence,
    labels: validation.labels,
    explanation:
      'Demonstration output only. The future ELI pipeline must be validated with EMOPET sensor and observation data before product use.',
  };
}
