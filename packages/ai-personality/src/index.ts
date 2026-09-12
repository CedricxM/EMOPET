export * from './tone/index.js';

// Legacy `templates/*`, `insights/*` and the standalone freemium scheduler are
// intentionally NOT exported from the package root. They contain pre-doctrine
// content paths and can bypass the canonical Breiz release registry/output guard.
// They remain internal migration code until explicitly redesigned or removed.

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

// Canonical Breiz release surface. Raw V6 templates are intentionally not exported
// separately; approved V6 content enters BLEIZ_RELEASE_TEMPLATES with SANITIZED_V6
// source authority and the same semantic ceilings as every other release template.
export * from './bleiz/bleiz-release-templates.js';
export * from './bleiz/bleiz-release-scheduler.js';
export * from './bleiz/bleiz-release-output.js';

export * from './bleiz/breed-normalizer.js';
export * from './bleiz/breed-resolver.js';
