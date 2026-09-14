import {
  scheduleBleizContent as scheduleLegacyBleizContent,
} from './bleiz-content-scheduler.js';
import type {
  ContentJob,
  SchedulerOptions,
} from './bleiz-content-scheduler.js';
import {
  BLEIZ_RELEASE_TEMPLATES,
  filterReleaseTemplates,
} from './bleiz-release-templates.js';
import type {
  BleizReleaseClass,
  BleizReleaseTemplate,
  BleizSemanticAuthority,
} from './bleiz-release-templates.js';

export type {
  BleizHistoryRecord,
  SchedulerOptions,
} from './bleiz-content-scheduler.js';

export {
  DAILY_CHANNEL_BUDGET,
  GLOBAL_BLACKLIST,
  evaluateTrigger,
  filterGeneratedText,
  filterPrompt,
  hasRequiredFields,
  publishDecision,
} from './bleiz-content-scheduler.js';

export interface ReleaseContentJob extends Omit<ContentJob, 'metadata'> {
  metadata: ContentJob['metadata'] & {
    releaseClass: BleizReleaseClass;
    semanticAuthority: BleizSemanticAuthority;
    sourceAuthority: BleizReleaseTemplate['sourceAuthority'];
  };
}

/**
 * Release-authorized scheduler entry point.
 *
 * Even when a caller supplies an explicit template list, legacy semantic or
 * performance/adherence templates are filtered out before scheduling. This is a
 * defense-in-depth boundary while #234 migrates the historical catalog itself.
 *
 * Every returned job carries its release class and semantic ceiling so downstream
 * UI/logging cannot silently forget what the content is allowed to claim.
 */
export function scheduleBleizContent(options: SchedulerOptions): ReleaseContentJob[] {
  const requested = options.templates ?? BLEIZ_RELEASE_TEMPLATES;
  const filtered = filterReleaseTemplates(requested);

  const releaseTemplates: BleizReleaseTemplate[] = filtered.map((template) => {
    const canonical = BLEIZ_RELEASE_TEMPLATES.find((item) => item.id === template.id);
    if (canonical) return canonical;

    // Explicit caller-supplied templates are only accepted when their ID matches a
    // canonical release template. This prevents a structurally safe but
    // unclassified ad-hoc template from bypassing the semantic registry.
    return null;
  }).filter((template): template is BleizReleaseTemplate => template !== null);

  const jobs = scheduleLegacyBleizContent({
    ...options,
    templates: releaseTemplates,
  });

  return jobs.map((job) => {
    const template = releaseTemplates.find((item) => item.id === job.templateId);
    if (!template) {
      // Defensive fail-closed path. In practice the legacy scheduler can only
      // return jobs for the supplied releaseTemplates list.
      throw new Error(`Release scheduler emitted an unclassified template: ${job.templateId}`);
    }

    return {
      ...job,
      metadata: {
        ...job.metadata,
        releaseClass: template.releaseClass,
        semanticAuthority: template.semanticAuthority,
        sourceAuthority: template.sourceAuthority,
      },
    };
  });
}
