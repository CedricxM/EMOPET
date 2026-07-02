/**
 * EMOPET Layered Configuration System
 *
 * 3-layer config resolution inspired by Claw Code:
 *   Layer 1 (SYSTEM): hardcoded defaults per breed
 *   Layer 2 (DOG_PROFILE): learned from sensor data
 *   Layer 3 (USER_PREFS): manual overrides by owner
 *
 * Resolution: Layer 3 > Layer 2 > Layer 1
 */

export type AlertSensitivity = 'normal' | 'sensitive' | 'relaxed';

export interface EmopetConfig {
  heat_alert_threshold_c: number;
  cold_alert_threshold_c: number;
  daily_exercise_target_min: number;
  daily_walk_km_target: number;
  rr_baseline: { mean: number; std: number } | null;
  eli_publish_threshold: number;
  eli_degrade_threshold: number;
  notification_quiet_start: string;
  notification_quiet_end: string;
  alert_sensitivity: AlertSensitivity;
  aiToneProfile: string;
}

export interface ConfigLayers {
  system: Partial<EmopetConfig>;
  dog_profile: Partial<EmopetConfig>;
  user_prefs: Partial<EmopetConfig>;
}

export interface ResolvedConfig extends EmopetConfig {
  layers: ConfigLayers;
}

const SYSTEM_DEFAULTS: EmopetConfig = {
  heat_alert_threshold_c: 25,
  cold_alert_threshold_c: 2,
  daily_exercise_target_min: 60,
  daily_walk_km_target: 3.0,
  rr_baseline: null,
  eli_publish_threshold: 0.70,
  eli_degrade_threshold: 0.40,
  notification_quiet_start: '22:00',
  notification_quiet_end: '07:00',
  alert_sensitivity: 'normal',
  aiToneProfile: 'BREIZ',
};

const USER_PREF_ALLOWED_KEYS: ReadonlyArray<keyof EmopetConfig> = [
  'notification_quiet_start',
  'notification_quiet_end',
  'alert_sensitivity',
  'aiToneProfile',
];

function sanitizeUserPrefs(userPrefs: Partial<EmopetConfig>): Partial<EmopetConfig> {
  const sanitized: Partial<EmopetConfig> = {};
  for (const key of USER_PREF_ALLOWED_KEYS) {
    if (userPrefs[key] !== undefined) {
      (sanitized as Record<keyof EmopetConfig, unknown>)[key] = userPrefs[key];
    }
  }
  return sanitized;
}

export function resolveConfig(
  breedDefaults: Partial<EmopetConfig>,
  dogProfile: Partial<EmopetConfig>,
  userPrefs: Partial<EmopetConfig>,
): ResolvedConfig {
  const safeUserPrefs = sanitizeUserPrefs(userPrefs);
  return {
    ...SYSTEM_DEFAULTS,
    ...breedDefaults,
    ...dogProfile,
    ...safeUserPrefs,
    layers: {
      system: breedDefaults,
      dog_profile: dogProfile,
      user_prefs: safeUserPrefs,
    },
  };
}

export function getBreedDefaults(breed: {
  heatAlertThresholdC?: number | null;
  coldSensitivity?: string | null;
  dailyExerciseMinMinutes?: number | null;
  dailyWalkKmMin?: number | null;
  isBrachycephalic?: boolean | null;
  sizeClass?: string | null;
}): Partial<EmopetConfig> {
  const defaults: Partial<EmopetConfig> = {};

  if (breed.heatAlertThresholdC != null) {
    defaults.heat_alert_threshold_c = breed.heatAlertThresholdC;
  } else if (breed.isBrachycephalic) {
    defaults.heat_alert_threshold_c = 18;
  } else if (breed.sizeClass === 'large' || breed.sizeClass === 'giant') {
    defaults.heat_alert_threshold_c = 22;
  }

  if (breed.coldSensitivity === 'high') {
    defaults.cold_alert_threshold_c = 5;
  }

  if (breed.dailyExerciseMinMinutes != null) {
    defaults.daily_exercise_target_min = breed.dailyExerciseMinMinutes;
  }

  if (breed.dailyWalkKmMin != null) {
    defaults.daily_walk_km_target = breed.dailyWalkKmMin;
  }

  return defaults;
}

export { SYSTEM_DEFAULTS };
