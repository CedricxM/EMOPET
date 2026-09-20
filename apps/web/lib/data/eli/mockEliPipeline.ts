/**
 * DISPOSITION ELI-ARCH-G1 (#118) : `DEMO_MOCK_ONLY`.
 *
 * Ce module est la moitié DÉMONSTRATION de `lib/data/eli/`. Il ne produit aucune
 * observation : il exécute la validation/gating sur des entrées fournies et
 * retourne un résultat explicitement non validé.
 *
 * La moitié CONTRAT du même répertoire (`dogProfile.schema`, `matEvent.schema`,
 * `tagEvent.schema`, `appObservation.schema`, `eliLabels`, `eliValidation`) est
 * consommée par du code produit et ne porte PAS cette classification. Les deux
 * moitiés ne peuvent donc pas être classées en bloc — voir l'inventaire G1.
 *
 * Sens de dépendance imposé : démo → contrat. Jamais l'inverse.
 * `lib/data/eli/__tests__/eli-surface-boundary.test.ts` verrouille cette règle.
 */

import type { EliValidationInput } from './eliValidation';
import { validateEliInput } from './eliValidation';

/**
 * Provenance de la sortie, même vocabulaire que la quarantaine du tableau de bord
 * (`ELI_WEB_MOCK_PROVENANCE`, #280) et que le chemin narration (#323) : une seule
 * convention de provenance web.
 */
export const ELI_DATA_MOCK_PROVENANCE = {
  classification: 'DEMO_MOCK_ONLY',
  authoritative: false,
  sourceModule: 'apps/web/lib/data/eli/mockEliPipeline.ts',
  matTagObservationSource: false,
  backendInferenceSource: false,
} as const;

export interface MockEliOutput {
  validated: false;
  status: 'mock_output' | 'insufficient_data' | 'invalid_input';
  confidence: number;
  labels: string[];
  explanation: string;
  /** Déclarée sur CHAQUE sortie : aucun consommateur ne peut l'ignorer par omission. */
  provenance: typeof ELI_DATA_MOCK_PROVENANCE;
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
      provenance: ELI_DATA_MOCK_PROVENANCE,
    };
  }

  return {
    validated: false,
    status: 'mock_output',
    confidence: validation.confidence,
    labels: validation.labels,
    explanation:
      'Demonstration output only. The future ELI pipeline must be validated with EMOPET sensor and observation data before product use.',
    provenance: ELI_DATA_MOCK_PROVENANCE,
  };
}
