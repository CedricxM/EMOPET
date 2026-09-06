import { BLEIZ_TEMPLATES } from './bleiz-content-templates.js';
import type { BleizTemplate } from './bleiz-content-templates.js';

/**
 * Release-time semantic firewall for legacy Breiz content.
 *
 * The historical template catalog is retained for migration/audit purposes, but
 * release scheduling must not activate templates whose semantic identity or
 * trigger source conflicts with the 2026-09-06 Experience Doctrine.
 */

const FORBIDDEN_ID_PATTERNS = [
  /ANXIETY/i,
  /DISTANCE_RECORD/i,
  /MAT_STREAK/i,
];

const FORBIDDEN_TRIGGER_FIELD_PATTERNS = [
  /mat_streak/i,
  /personal_best/i,
  /weekly_distance_goal/i,
  /weekly_distance_last/i,
];

function allTemplateFields(template: BleizTemplate): string[] {
  return [
    ...template.required_fields,
    ...template.triggers.map((trigger) => trigger.field),
  ];
}

export function releaseTemplateBlockReason(template: BleizTemplate): string | null {
  if (FORBIDDEN_ID_PATTERNS.some((pattern) => pattern.test(template.id))) {
    return `legacy semantic/reward identifier: ${template.id}`;
  }

  const offendingField = allTemplateFields(template).find((field) =>
    FORBIDDEN_TRIGGER_FIELD_PATTERNS.some((pattern) => pattern.test(field)),
  );
  if (offendingField) {
    return `forbidden performance/adherence trigger: ${offendingField}`;
  }

  // Milestone content may not be sensor-driven in release authority. A factual
  // sensor observation belongs to Care; it must not silently become a reward.
  if (
    template.category === 'milestone' &&
    allTemplateFields(template).some((field) => field.startsWith('sensor.'))
  ) {
    return 'sensor-driven milestone is not release-authorized';
  }

  return null;
}

export function isReleaseTemplateAuthorized(template: BleizTemplate): boolean {
  return releaseTemplateBlockReason(template) === null;
}

export function filterReleaseTemplates(templates: BleizTemplate[]): BleizTemplate[] {
  return templates.filter(isReleaseTemplateAuthorized);
}

export const BLEIZ_RELEASE_TEMPLATES: BleizTemplate[] = filterReleaseTemplates(BLEIZ_TEMPLATES);
