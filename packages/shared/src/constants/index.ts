/**
 * EMOPET system constants — single source of truth.
 * These values must match firmware compile-time config.
 */

// ── Confidence Gating (NON-NEGOTIABLE) ──────────────────────────
export const CONF_PUBLISH = 0.70;
export const CONF_DEGRADE = 0.40;

// ── ELI Model Parameters (population priors) ────────────────────
export const ELI_RHO_A_DEFAULT = 0.95;
export const ELI_DELTA_L_DEFAULT = 0.05;
export const ELI_BASELINE_WARMUP_DAYS = 10;
export const ELI_BASELINE_MIN_HOURS = 72;

// ── Sensor Thresholds ───────────────────────────────────────────
/** PVDF: minimum peak-to-peak mV for valid respiratory signal. */
export const PVDF_MIN_PP_MV = 2.0;
/** Load cell: minimum weight (kg) for presence detection. */
export const LOAD_CELL_PRESENCE_KG = 0.3;
/** IMU: activity magnitude threshold for stillness (g). */
export const IMU_STILLNESS_G = 0.05;
/** IMU: activity magnitude for vigorous activity (g). */
export const IMU_VIGOROUS_G = 1.0;
/** Microphone: bark detection minimum duration (ms). */
export const MIC_MIN_EVENT_MS = 40;
/** Microphone: inter-event refractory period (ms). */
export const MIC_REFRACTORY_MS = 200;

// ── BLE Protocol ────────────────────────────────────────────────
export const BLE_FRAME_HEADER = 0xea;
export const BLE_FRAME_VERSION = 0x01;
export const BLE_SOURCE_MAT = 0x01;
export const BLE_SOURCE_TAG = 0x02;
export const BLE_NOTIFICATION_INTERVAL_MS = 5000;

/**
 * Proprietary 128-bit EMOPET BLE UUID namespace.
 *
 * Do not replace these with Bluetooth Base UUID aliases (0000XXXX-0000-1000-
 * 8000-00805f9b34fb) unless EMOPET owns the corresponding SIG Assigned Number.
 */
export const BLE_SERVICE_UUID = 'e4e2e9a3-39c8-4140-aba9-c4e37713f59a';
/** SensorFrame characteristic UUID. */
export const BLE_CHAR_SENSOR_FRAME = '66ae0c98-a8ce-4319-b47d-f09fa88d4d83';
/** OTA characteristic UUID. */
export const BLE_CHAR_OTA = '17780ee9-7def-4b89-aea5-e7a27deaf95c';
/** Config characteristic UUID. */
export const BLE_CHAR_CONFIG = '8d5fa4ff-d1fa-49c3-9ce4-2e8865e4d478';
/**
 * Versioned deterministic feature-summary notification characteristic.
 *
 * Reserved by #122 for feature-summary transport. The UUID assignment does not
 * imply that current TAG firmware already exposes a live GATT characteristic.
 */
export const BLE_CHAR_FEATURE_SUMMARY = '01141d55-a776-4091-b068-83f0804d8781';
/** Read-only TAG boot-session + monotonic clock sample for BOOT_ANCHOR_V1. */
export const BLE_CHAR_CLOCK_SAMPLE = '7c2c7cc8-91a8-58c1-a38a-2f9b9929f5d5';

// ── Fur Class Definitions ───────────────────────────────────────
export const FUR_CLASSES = {
  FC1: { label: 'Minimal', depthMm: '0-5', examples: 'Whippet, Boxer, Dalmatien' },
  FC2: { label: 'Modere', depthMm: '5-15', examples: 'Labrador, Beagle, Berger Allemand' },
  FC3: { label: 'Dense', depthMm: '15-30', examples: 'Golden, Border Collie, Chow Chow' },
  FC4: { label: 'Extreme', depthMm: '30+', examples: 'Husky, Malamute, Samoyede' },
} as const;

// ── Onboarding ──────────────────────────────────────────────────
export const ONBOARDING_DAYS = 5;
export const ONBOARDING_TREATS_SCHEDULE = [3, 2, 1, 1, 0];

// ── Subscription Pricing (EUR) ──────────────────────────────────
export const PLANS = {
  monthly: { priceEur: 7.99, label: 'Mensuel' },
  annual: { priceEur: 59.90, label: 'Annuel (4.99/mois)' },
  all_inclusive: { priceEur: 10.99, label: 'Tout inclus' },
} as const;

// ── Progressive Rewards ─────────────────────────────────────────
export const PROGRESSIVE_REWARDS = {
  3: { unlock: 'weekly_insights', label: 'Insights hebdomadaires debloques !' },
  6: { unlock: 'breed_comparison', label: 'Comparaisons de race disponibles !' },
  9: { unlock: 'food_recommendations', label: 'Recommandations alimentaires !' },
  12: { unlock: 'founding_member', label: 'Membre fondateur !', badge: true, freeMonth: true },
  18: { unlock: 'predictive_ai', label: 'IA predictive debloquee !' },
  24: { unlock: 'regional_event', label: 'Invitation evenement regional !' },
} as const;

// ── Copresence ──────────────────────────────────────────────────
export const COPRESENCE_RADIUS_M = 200;
export const COPRESENCE_SCAN_INTERVAL_MS = 5 * 60 * 1000;
export const COPRESENCE_RECURRING_THRESHOLD = 3;

// ── Referent System ─────────────────────────────────────────────
export const REFERENT_MIN_WEEKS = 4;
export const REFERENT_WEEKLY_INTERACTIONS = 10;
export const REFERENT_WEEKLY_RESPONSES = 3;
export const REFERENT_TONE_SCORE_MIN = 0.7;

// Privacy retention authority lives in config/privacy/retention-schedule.json.
// Do not duplicate product/legal retention clocks in shared runtime constants.

export * from './feature-progress.js';
