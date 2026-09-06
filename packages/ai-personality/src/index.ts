export * from './tone/index.js';
export * from './templates/index.js';
export * from './insights/index.js';
export * from './content-templates.js';
export * from './content-scheduler.js';

// Breiz historical catalog: types remain public for compatibility, but executable
// catalog values are deliberately exposed only under LEGACY_* names. Release
// consumers must use BLEIZ_RELEASE_TEMPLATES + the release scheduler.
export type {
  BleizCategory,
  BleizChannel,
  BleizContexts,
  BleizTargeting,
  BleizTemplate,
  BleizTone,
  BleizTriggerKind,
  CommunityContext,
  ConfidenceGate,
  DogContext,
  SensorContext,
  TriggerOperator,
  TriggerSpec,
  UserContext,
} from './bleiz/bleiz-content-templates.js';

export {
  BLEIZ_TEMPLATES as LEGACY_BLEIZ_TEMPLATES,
  BLEIZ_TEMPLATE_STATS as LEGACY_BLEIZ_TEMPLATE_STATS,
} from './bleiz/bleiz-content-templates.js';

export * from './bleiz/bleiz-release-templates.js';
export * from './bleiz/bleiz-release-scheduler.js';
export * from './bleiz/bleiz-v6-templates.js';
export * from './bleiz/breed-normalizer.js';
export * from './bleiz/breed-resolver.js';
export * from './bleiz/freemium-scheduler.js';
