import { BLEIZ_TEMPLATES } from './bleiz-content-templates.js';
import type { BleizTemplate } from './bleiz-content-templates.js';

/**
 * Release-time semantic firewall for legacy Breiz content.
 *
 * The historical template catalog is retained for migration/audit purposes, but
 * release scheduling must not activate templates whose semantic identity or
 * trigger source conflicts with the 2026-09-06 Experience Doctrine.
 *
 * IMPORTANT: release authority lives in this file, not in the historical
 * `BLEIZ_TEMPLATES` catalog.
 */

export type BleizReleaseClass =
  | 'OBSERVATION_EXPLANATION'
  | 'GENERAL_EDUCATION'
  | 'SEASONAL_CONTEXT'
  | 'SUGGESTION'
  | 'COMMUNITY_CONTENT';

export type BleizSemanticAuthority =
  | 'OBSERVATION_ONLY'
  | 'EDUCATION_ONLY'
  | 'CONTEXT_ONLY'
  | 'SUGGESTION_ONLY'
  | 'COMMUNITY_ONLY';

export type BleizReleaseTemplate = BleizTemplate & {
  /** Machine-readable product role. It is not a scientific or clinical label. */
  releaseClass: BleizReleaseClass;
  /** Hard ceiling on what the generated content is allowed to claim. */
  semanticAuthority: BleizSemanticAuthority;
  /** Stable source marker used during the legacy-catalog migration. */
  sourceAuthority: 'RELEASE_NATIVE' | 'SANITIZED_LEGACY';
};

const FORBIDDEN_ID_PATTERNS = [
  /ANXIETY/i,
  /DISTANCE_RECORD/i,
  /MAT_STREAK/i,
  /REL_MEMORY/i,
  /WALK_QUALITY/i,
];

const FORBIDDEN_TRIGGER_FIELD_PATTERNS = [
  /mat_streak/i,
  /personal_best/i,
  /weekly_distance_goal/i,
  /weekly_distance_last/i,
  /sensor\.wqi/i,
];

const FORBIDDEN_RELATIONSHIP_DERIVATION_FIELDS = [
  /^sensor\./i,
  /^computed\./i,
  /^event\.walk/i,
  /^user\.total_km$/i,
  /^user\.total_insights$/i,
];

function allTemplateFields(template: BleizTemplate): string[] {
  return [
    ...template.required_fields,
    ...template.triggers.map((trigger) => trigger.field),
  ];
}

function usesSensorOrComputedEvidence(template: BleizTemplate): boolean {
  return allTemplateFields(template).some(
    (field) => field.startsWith('sensor.') || field.startsWith('computed.'),
  );
}

export function releaseTemplateBlockReason(template: BleizTemplate): string | null {
  if (FORBIDDEN_ID_PATTERNS.some((pattern) => pattern.test(template.id))) {
    return `legacy semantic/reward identifier: ${template.id}`;
  }

  const fields = allTemplateFields(template);
  const offendingField = fields.find((field) =>
    FORBIDDEN_TRIGGER_FIELD_PATTERNS.some((pattern) => pattern.test(field)),
  );
  if (offendingField) {
    return `forbidden performance/adherence trigger: ${offendingField}`;
  }

  // Milestone content may not be sensor-driven in release authority. A factual
  // sensor observation belongs to Care; it must not silently become a reward.
  if (
    template.category === 'milestone' &&
    fields.some((field) => field.startsWith('sensor.'))
  ) {
    return 'sensor-driven milestone is not release-authorized';
  }

  // Relationship quality, bond strength or emotional balance may not be derived
  // from MAT/TAG/ELI/computed evidence. Those signals can support an observation
  // in Care, but they cannot become a relationship truth in Breiz.
  if (template.category === 'relationship') {
    const relationshipField = fields.find((field) =>
      FORBIDDEN_RELATIONSHIP_DERIVATION_FIELDS.some((pattern) => pattern.test(field)),
    );
    if (relationshipField) {
      return `sensor/computed relationship narrative is not release-authorized: ${relationshipField}`;
    }
  }

  return null;
}

export function isReleaseTemplateAuthorized(template: BleizTemplate): boolean {
  return releaseTemplateBlockReason(template) === null;
}

export function filterReleaseTemplates(templates: BleizTemplate[]): BleizTemplate[] {
  return templates.filter(isReleaseTemplateAuthorized);
}

function releaseRoleFor(template: BleizTemplate): Pick<BleizReleaseTemplate, 'releaseClass' | 'semanticAuthority'> {
  switch (template.category) {
    case 'behavior':
    case 'activity':
      return {
        releaseClass: 'OBSERVATION_EXPLANATION',
        semanticAuthority: 'OBSERVATION_ONLY',
      };
    case 'health_breed':
    case 'nutrition':
      if (usesSensorOrComputedEvidence(template)) {
        return {
          releaseClass: 'OBSERVATION_EXPLANATION',
          semanticAuthority: 'OBSERVATION_ONLY',
        };
      }
      return {
        releaseClass: 'GENERAL_EDUCATION',
        semanticAuthority: 'EDUCATION_ONLY',
      };
    case 'health_seasonal':
    case 'environment':
      return {
        releaseClass: 'SEASONAL_CONTEXT',
        semanticAuthority: 'CONTEXT_ONLY',
      };
    case 'community':
      return {
        releaseClass: 'COMMUNITY_CONTENT',
        semanticAuthority: 'COMMUNITY_ONLY',
      };
    case 'relationship':
      return {
        releaseClass: 'SUGGESTION',
        semanticAuthority: 'SUGGESTION_ONLY',
      };
    case 'behavior_education':
    case 'education':
    case 'milestone':
    default:
      return {
        releaseClass: 'GENERAL_EDUCATION',
        semanticAuthority: 'EDUCATION_ONLY',
      };
  }
}

function toSanitizedLegacy(template: BleizTemplate): BleizReleaseTemplate {
  return {
    ...template,
    ...releaseRoleFor(template),
    sourceAuthority: 'SANITIZED_LEGACY',
  };
}

/**
 * Replacement for the historical `BHV_ANXIETY_PATTERN` semantic identity.
 *
 * The input evidence remains the same observable combination, but the release
 * template does not encode anxiety, stress or another latent state as truth.
 * It describes the observed pattern and keeps causal interpretation open.
 */
const LEGACY_ANXIETY_PATTERN = BLEIZ_TEMPLATES.find((template) => template.id === 'BHV_ANXIETY_PATTERN');

export const BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN: BleizReleaseTemplate | null =
  LEGACY_ANXIETY_PATTERN
    ? {
        ...LEGACY_ANXIETY_PATTERN,
        id: 'BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN',
        category: 'behavior',
        releaseClass: 'OBSERVATION_EXPLANATION',
        semanticAuthority: 'OBSERVATION_ONLY',
        sourceAuthority: 'SANITIZED_LEGACY',
        never_say: [
          ...new Set([
            ...LEGACY_ANXIETY_PATTERN.never_say,
            'anxiete',
            'anxiety',
            'emotion',
            'peur',
            'panique',
            'cause',
          ]),
        ],
        suffix:
          'Si ce changement persiste ou vous preoccupe, vous pouvez partager la chronologie avec votre veterinaire.',
        prompt: [
          'Write a short French home insight for {{dog.name}}.',
          'Describe only the observable combination: more movement, less qualified mat rest, and more vocal activity than the recent reference.',
          'Do not name an emotion, disorder, diagnosis, cause, motivation, or hidden internal state.',
          'Say explicitly that several explanations can remain possible.',
          'Offer at most one low-pressure routine or enrichment suggestion, clearly separated from the observation.',
        ].join('\n'),
      }
    : null;

const SANITIZED_LEGACY_RELEASE_TEMPLATES = filterReleaseTemplates(BLEIZ_TEMPLATES).map(toSanitizedLegacy);

const RELEASE_NATIVE_REPLACEMENTS: BleizReleaseTemplate[] = [
  ...(BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN
    ? [BHV_ELEVATED_ACTIVITY_LOW_REST_VOCAL_PATTERN]
    : []),
];

/**
 * Canonical release catalog.
 *
 * Blocked legacy templates stay out. A safe replacement may be introduced under
 * a new observable-pattern identity, but never by silently re-authorizing the old
 * latent-state identifier.
 */
export const BLEIZ_RELEASE_TEMPLATES: BleizReleaseTemplate[] = [
  ...SANITIZED_LEGACY_RELEASE_TEMPLATES,
  ...RELEASE_NATIVE_REPLACEMENTS,
];

export const BLEIZ_RELEASE_TEMPLATE_STATS = {
  total: BLEIZ_RELEASE_TEMPLATES.length,
  byClass: BLEIZ_RELEASE_TEMPLATES.reduce<Record<BleizReleaseClass, number>>(
    (acc, template) => {
      acc[template.releaseClass] += 1;
      return acc;
    },
    {
      OBSERVATION_EXPLANATION: 0,
      GENERAL_EDUCATION: 0,
      SEASONAL_CONTEXT: 0,
      SUGGESTION: 0,
      COMMUNITY_CONTENT: 0,
    },
  ),
};
