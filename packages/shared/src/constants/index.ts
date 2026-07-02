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

/** Custom EMOPET BLE service UUID. */
export const BLE_SERVICE_UUID = '0000ea01-0000-1000-8000-00805f9b34fb';
/** SensorFrame characteristic UUID. */
export const BLE_CHAR_SENSOR_FRAME = '0000ea02-0000-1000-8000-00805f9b34fb';
/** OTA characteristic UUID. */
export const BLE_CHAR_OTA = '0000ea03-0000-1000-8000-00805f9b34fb';
/** Config characteristic UUID. */
export const BLE_CHAR_CONFIG = '0000ea04-0000-1000-8000-00805f9b34fb';

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

// ── GDPR ────────────────────────────────────────────────────────
export const GPS_RETENTION_DAYS = 30;
export const SENSOR_SUMMARY_RETENTION_MONTHS = 24;
export const AI_INSIGHT_RETENTION_MONTHS = 24;

export * from './feature-progress.js';
