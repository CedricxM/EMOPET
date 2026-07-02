/**
 * Sensor data types — what the cloud stores.
 *
 * Critical rule: cloud stores HOURLY SUMMARIES only.
 * Raw sensor data stays on-device. No exceptions.
 */

export type SensorSource = 'MAT' | 'TAG';

/** Posture classification from IMU. */
export type Posture = 'lying' | 'sitting' | 'standing' | 'walking' | 'running' | 'unknown';

/** Respiratory rate with quality metadata. */
export interface RespiratoryRate {
  mean: number;
  std: number;
  confidence: number;
}

/** Posture time distribution within a summary window. */
export interface PostureDistribution {
  lying: number;
  sitting: number;
  standing: number;
  walking: number;
  running: number;
}

/** Hourly sensor summary — the canonical cloud storage format. */
export interface SensorSummary {
  id: string;
  timestamp: Date;
  dogId: string;
  source: SensorSource;

  // MAT data
  matPresenceMinutes?: number;
  respiratoryRate?: RespiratoryRate;
  weightKg?: number;
  positionChanges?: number;

  // TAG data
  activityMinutes?: number;
  distanceKm?: number;
  vocalEvents?: number;
  vocalEnergyMean?: number;
  postureDistribution?: PostureDistribution;
  agitationEvents?: number;

  // Environment
  temperatureC?: number;
  humidityPct?: number;
}

/** Device info. */
export interface Device {
  id: string;
  type: 'MAT' | 'TAG';
  serialNumber: string;
  firmwareVersion: string;
  hardwareRevision: string;
  dogId?: string;
  ownerId: string;
  batteryPct?: number;
  lastSeenAt?: Date;
  pairedAt: Date;
}

// ─── Behavioral Science Metrics (computed from sensor summaries) ──

/** Separation/absence behavior metrics — computed by PresenceService. */
export interface AbsenceMetrics {
  absence_sessions_count: number;
  absence_agitation_mean: number;
  absence_vocal_events_mean: number;
  absence_rest_minutes_mean: number;
  presence_agitation_mean: number;
  absence_agitation_trend_4w: 'declining' | 'stable_low' | 'stable_high' | 'increasing';
  absence_vocal_trend_4w: 'declining' | 'stable' | 'increasing';
  reunion_imu_spike_magnitude: number;
  reunion_vocal_events: number;
  reunion_duration_to_calm_min: number;
  pre_departure_agitation_15min: number;
  usual_departure_time: string;
  departure_time_buckets: Record<string, number>;
  post_departure_agitation_by_bucket: Record<string, number>;
  weekday_absence_hours_mean: number;
  weekend_absence_hours_mean: number;
  weekday_agitation_mean: number;
  weekend_agitation_mean: number;
  first_full_calm_absence_date: string | null;
  short_absence_agitation_mean: number;
  long_absence_agitation_mean: number;
}

/** Noise event metrics — computed from mic + IMU correlation. */
export interface NoiseEventMetrics {
  mic_ambient_db_peak: number;
  mic_spectral_profile: string;
  noise_type_detected: 'thunder' | 'firework' | 'construction' | 'unknown';
  imu_tremor_detected: boolean;
  imu_agitation_during_noise: number;
  rr_during_noise: number | null;
  rr_baseline: number | null;
  event_duration_min: number;
  recovery_minutes: number;
  on_mat_during: boolean;
  noise_event_count_30d: number;
  noise_recovery_trend: 'improving' | 'stable' | 'worsening';
}

/** Thermal comfort metrics — computed from BME280 + weather API + breed knowledge. */
export interface ThermalMetrics {
  ambient_temp_c: number;
  humidity_pct: number;
  breed_heat_threshold_c: number;
  is_brachycephalic: boolean;
  rr_during_heat: number | null;
  activity_reduction_pct: number | null;
  indoor_temp_c: number | null;
  temp_trend_2w: 'warming' | 'stable' | 'cooling';
}

/** Multi-sensor behavioral insights — require gold context tier. */
export interface MultiSensorMetrics {
  mat_deep_rest_minutes_week: number;
  mat_deep_rest_hours_night_mean: number;
  mat_rr_stability_score: number;
  mat_position_changes_night: number;
  ambient_temp_night_mean: number;
  walk_sniffing_ratio: number;
  post_exercise_recovery_minutes: number;
  daily_rhythm_consistency: number;
  weight_kg_current: number;
  weight_kg_trend_4w: 'stable' | 'increasing' | 'decreasing';
  copresence_regular_count: number;
  night_restlessness_score: number;
  interaction_intensity_events: number;
}

/** Allostatic resilience metrics — longitudinal stress recovery patterns. */
export interface AllostaticMetrics {
  post_stressor_recovery_minutes_mean: number;
  post_stressor_recovery_trend_4w: 'improving' | 'stable' | 'slowing';
  elevated_arousal_episodes_week: number;
  elevated_arousal_episodes_avg: number;
  high_activation_rest_correlation: 'better_rest' | 'worse_rest' | 'no_effect';
  monthly_rest_quality_score: number;
  monthly_activity_consistency: number;
  monthly_absence_stability: number;
}
