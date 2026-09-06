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

export type {
  BleizHistoryRecord,
  ContentJob,
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

/**
 * Release-authorized scheduler entry point.
 *
 * Even when a caller supplies an explicit template list, legacy semantic or
 * performance/adherence templates are filtered out before scheduling. This is a
 * defense-in-depth boundary while #234 migrates the historical catalog itself.
 */
export function scheduleBleizContent(options: SchedulerOptions): ContentJob[] {
  const requested = options.templates ?? BLEIZ_RELEASE_TEMPLATES;
  const templates = filterReleaseTemplates(requested);

  return scheduleLegacyBleizContent({
    ...options,
    templates,
  });
}
