/**
 * MotsPet cross-locale semantic QA.
 *
 * Public wording may differ by locale. The semantic ceiling may not.
 * This module deliberately separates:
 * - human-facing text projection (FR/EN);
 * - invariant truth/provenance/privacy/medical constraints.
 *
 * It is a QA contract, not a translation engine.
 */

import {
  MOTSPET_ENTRIES,
  MOTSPET_REVISION,
  type MotsPetEntry,
} from './motspet';

export type MotsPetLocale = 'fr' | 'en';

export type MotsPetTruthClass =
  | 'BOUNDED_OBSERVATION'
  | 'OWNER_DECLARED_CONTEXT'
  | 'CONFIDENCE_METADATA'
  | 'EPISTEMIC_ABSTENTION'
  | 'PROVENANCE_METADATA'
  | 'CONTEXT_METADATA'
  | 'TEMPORAL_METADATA'
  | 'INDIVIDUAL_REFERENCE'
  | 'INTERPRETATION_LIMIT'
  | 'PUBLICATION_METADATA'
  | 'DEVICE_STATE'
  | 'SIGNAL_QUALITY'
  | 'MODEL_METADATA'
  | 'UNCERTAINTY_METADATA'
  | 'LONGITUDINAL_CHANGE'
  | 'OWNER_PREFERENCE'
  | 'SHARING_SCOPE_METADATA'
  | 'INTENTIONAL_CAPTURE'
  | 'OWNER_CHOSEN_MEMORY_CONTENT'
  | 'EXPLICIT_AUDIENCE_CHOICE'
  | 'PURPOSE_BOUND_PERMISSION';

export interface MotsPetSemanticContract {
  conceptId: string;
  truthClass: MotsPetTruthClass;
  provenance: 'REQUIRED' | 'NOT_REQUIRED';
  causalBoundary: 'NO_CAUSAL_UPGRADE';
  medicalBoundary: 'NON_DIAGNOSTIC';
  privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT';
}

export interface MotsPetLocaleProjection extends MotsPetSemanticContract {
  locale: MotsPetLocale;
  publicTerm: string;
  revision: typeof MOTSPET_REVISION;
}

export interface MotsPetSemanticDrift {
  conceptId: string;
  field:
    | 'missing_concept'
    | 'truthClass'
    | 'provenance'
    | 'causalBoundary'
    | 'medicalBoundary'
    | 'privacyBoundary'
    | 'revision';
  left?: string;
  right?: string;
}

/**
 * Semantic contracts are intentionally explicit rather than inferred from
 * translated strings.
 */
export const MOTSPET_SEMANTIC_CONTRACTS: Readonly<
  Record<string, MotsPetSemanticContract>
> = {
  observation: {
    conceptId: 'observation',
    truthClass: 'BOUNDED_OBSERVATION',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  owner_note: {
    conceptId: 'owner_note',
    truthClass: 'OWNER_DECLARED_CONTEXT',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  confidence: {
    conceptId: 'confidence',
    truthClass: 'CONFIDENCE_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  uncertainty: {
    conceptId: 'uncertainty',
    truthClass: 'UNCERTAINTY_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  insufficient_evidence: {
    conceptId: 'insufficient_evidence',
    truthClass: 'EPISTEMIC_ABSTENTION',
    provenance: 'NOT_REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  source: {
    conceptId: 'source',
    truthClass: 'PROVENANCE_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  context: {
    conceptId: 'context',
    truthClass: 'CONTEXT_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  time_window: {
    conceptId: 'time_window',
    truthClass: 'TEMPORAL_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  individual_reference: {
    conceptId: 'individual_reference',
    truthClass: 'INDIVIDUAL_REFERENCE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  trend: {
    conceptId: 'trend',
    truthClass: 'LONGITUDINAL_CHANGE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  limits: {
    conceptId: 'limits',
    truthClass: 'INTERPRETATION_LIMIT',
    provenance: 'NOT_REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  publication_state: {
    conceptId: 'publication_state',
    truthClass: 'PUBLICATION_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  device_state: {
    conceptId: 'device_state',
    truthClass: 'DEVICE_STATE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  signal_quality: {
    conceptId: 'signal_quality',
    truthClass: 'SIGNAL_QUALITY',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  model_version: {
    conceptId: 'model_version',
    truthClass: 'MODEL_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  share_scope: {
    conceptId: 'share_scope',
    truthClass: 'SHARING_SCOPE_METADATA',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  explicit_preference: {
    conceptId: 'explicit_preference',
    truthClass: 'OWNER_PREFERENCE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  moment: {
    conceptId: 'moment',
    truthClass: 'INTENTIONAL_CAPTURE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  memory: {
    conceptId: 'memory',
    truthClass: 'OWNER_CHOSEN_MEMORY_CONTENT',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  community_visibility: {
    conceptId: 'community_visibility',
    truthClass: 'EXPLICIT_AUDIENCE_CHOICE',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
  consent: {
    conceptId: 'consent',
    truthClass: 'PURPOSE_BOUND_PERMISSION',
    provenance: 'REQUIRED',
    causalBoundary: 'NO_CAUSAL_UPGRADE',
    medicalBoundary: 'NON_DIAGNOSTIC',
    privacyBoundary: 'PRESERVE_PURPOSE_AND_CONSENT',
  },
};

function controlledEntries(
  entries: readonly MotsPetEntry[] = MOTSPET_ENTRIES,
): readonly MotsPetEntry[] {
  return entries.filter((entry) => entry.status === 'CONTROLLED_SEED');
}

export function buildMotsPetLocaleProjection(
  locale: MotsPetLocale,
  entries: readonly MotsPetEntry[] = MOTSPET_ENTRIES,
): MotsPetLocaleProjection[] {
  const projected: MotsPetLocaleProjection[] = [];

  for (const entry of controlledEntries(entries)) {
    const contract = MOTSPET_SEMANTIC_CONTRACTS[entry.id];
    if (!contract) continue;

    projected.push({
      ...contract,
      locale,
      publicTerm: locale === 'fr' ? entry.publicFr : entry.publicEn,
      revision: entry.revision,
    });
  }

  return projected;
}

export function auditMotsPetSemanticCoverage(
  entries: readonly MotsPetEntry[] = MOTSPET_ENTRIES,
): string[] {
  const errors: string[] = [];
  const controlled = controlledEntries(entries);
  const controlledIds = new Set(controlled.map((entry) => entry.id));

  for (const entry of controlled) {
    const contract = MOTSPET_SEMANTIC_CONTRACTS[entry.id];

    if (!contract) {
      errors.push(`${entry.id}: missing semantic contract`);
      continue;
    }

    if (contract.conceptId !== entry.id) {
      errors.push(`${entry.id}: semantic contract conceptId mismatch`);
    }

    const expectedProvenance = entry.requiresProvenance ? 'REQUIRED' : 'NOT_REQUIRED';
    if (contract.provenance !== expectedProvenance) {
      errors.push(
        `${entry.id}: provenance mismatch (${contract.provenance} != ${expectedProvenance})`,
      );
    }

    if (!entry.publicFr.trim()) errors.push(`${entry.id}: blank publicFr`);
    if (!entry.publicEn.trim()) errors.push(`${entry.id}: blank publicEn`);
  }

  for (const conceptId of Object.keys(MOTSPET_SEMANTIC_CONTRACTS)) {
    if (!controlledIds.has(conceptId)) {
      errors.push(`${conceptId}: semantic contract has no CONTROLLED_SEED entry`);
    }
  }

  return errors;
}

const INVARIANT_FIELDS = [
  'truthClass',
  'provenance',
  'causalBoundary',
  'medicalBoundary',
  'privacyBoundary',
  'revision',
] as const;

export function compareMotsPetLocaleSemantics(
  left: readonly MotsPetLocaleProjection[],
  right: readonly MotsPetLocaleProjection[],
): MotsPetSemanticDrift[] {
  const drift: MotsPetSemanticDrift[] = [];
  const leftById = new Map(left.map((entry) => [entry.conceptId, entry]));
  const rightById = new Map(right.map((entry) => [entry.conceptId, entry]));
  const allIds = new Set([...leftById.keys(), ...rightById.keys()]);

  for (const conceptId of allIds) {
    const a = leftById.get(conceptId);
    const b = rightById.get(conceptId);

    if (!a || !b) {
      drift.push({
        conceptId,
        field: 'missing_concept',
        left: a ? 'present' : 'missing',
        right: b ? 'present' : 'missing',
      });
      continue;
    }

    for (const field of INVARIANT_FIELDS) {
      if (a[field] !== b[field]) {
        drift.push({
          conceptId,
          field,
          left: String(a[field]),
          right: String(b[field]),
        });
      }
    }
  }

  return drift;
}

export function auditCurrentMotsPetFrEnSemantics(): MotsPetSemanticDrift[] {
  const fr = buildMotsPetLocaleProjection('fr');
  const en = buildMotsPetLocaleProjection('en');
  return compareMotsPetLocaleSemantics(fr, en);
}
