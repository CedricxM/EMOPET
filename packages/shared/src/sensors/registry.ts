/**
 * EMOPET Sensor Registry
 *
 * Centralizes sensor metadata like Claw Code's ToolRegistry.
 * Each sensor has its spec, reliability profile, and hardware references.
 */

export interface SensorSpec {
  id: string;
  name: string;
  module: 'MAT' | 'TAG';
  measures: string[];
  derived_features: string[];
  sampling_hz: number;
  reliability_by_context: {
    gold: number;
    silver: number;
    bronze: number;
    rejected: number;
  };
  requires_mat: boolean;
  requires_tag: boolean;
  requires_immobility: boolean;
  min_contact_quality: number;
  component_ref: string;
  power_ua_active: number;
  power_ua_sleep: number;
}

export const SENSOR_REGISTRY: SensorSpec[] = [
  {
    id: 'pvdf_mat',
    name: 'PVDF Piezoelectric Array (MAT)',
    module: 'MAT',
    measures: ['respiratory_rate', 'micro_movement', 'respiratory_regularity'],
    derived_features: ['rr_bpm', 'rr_std', 'rr_regularity', 'stillness_score'],
    sampling_hz: 100,
    reliability_by_context: { gold: 0.95, silver: 0.75, bronze: 0.3, rejected: 0 },
    requires_mat: true,
    requires_tag: false,
    requires_immobility: true,
    min_contact_quality: 0.6,
    component_ref: 'LDT0-028K',
    power_ua_active: 50,
    power_ua_sleep: 0.1,
  },
  {
    id: 'load_cell_mat',
    name: 'Load Cells x4 (MAT)',
    module: 'MAT',
    measures: ['weight', 'presence', 'posture_distribution'],
    derived_features: ['weight_kg', 'presence_bool', 'weight_stability', 'posture_quadrant'],
    sampling_hz: 10,
    reliability_by_context: { gold: 0.99, silver: 0.95, bronze: 0.80, rejected: 0.5 },
    requires_mat: true,
    requires_tag: false,
    requires_immobility: false,
    min_contact_quality: 0,
    component_ref: 'TAL220B + HX711',
    power_ua_active: 1500,
    power_ua_sleep: 0.4,
  },
  {
    id: 'imu_tag',
    name: 'IMU 6-axis (TAG)',
    module: 'TAG',
    measures: ['activity_intensity', 'posture', 'agitation_events', 'shake_detection'],
    derived_features: ['acc_rms_mg', 'pitch_deg', 'roll_deg', 'odba', 'step_count', 'shake_flag'],
    sampling_hz: 50,
    reliability_by_context: { gold: 0.90, silver: 0.85, bronze: 0.70, rejected: 0.2 },
    requires_mat: false,
    requires_tag: true,
    requires_immobility: false,
    min_contact_quality: 0.3,
    component_ref: 'BMI270',
    power_ua_active: 685,
    power_ua_sleep: 3.5,
  },
  {
    id: 'mic_tag',
    name: 'MEMS Microphone (TAG)',
    module: 'TAG',
    measures: ['vocalization_events', 'vocal_energy', 'environmental_noise'],
    derived_features: ['vocal_event_count', 'vocal_energy_db', 'spectral_flatness', 'bark_flag'],
    sampling_hz: 16000,
    reliability_by_context: { gold: 0.85, silver: 0.70, bronze: 0.40, rejected: 0.1 },
    requires_mat: false,
    requires_tag: true,
    requires_immobility: false,
    min_contact_quality: 0,
    component_ref: 'IM69D130',
    power_ua_active: 980,
    power_ua_sleep: 12,
  },
  {
    id: 'piezo_tag',
    name: 'Piezo Disc 15mm (TAG ventral)',
    module: 'TAG',
    measures: ['throat_vibration', 'partial_respiratory_rate'],
    derived_features: ['vibro_energy', 'vibro_rr_bpm_partial'],
    sampling_hz: 100,
    reliability_by_context: { gold: 0.60, silver: 0.40, bronze: 0.15, rejected: 0 },
    requires_mat: false,
    requires_tag: true,
    requires_immobility: true,
    min_contact_quality: 0.5,
    component_ref: 'PZT-5H 15mm',
    power_ua_active: 30,
    power_ua_sleep: 0.1,
  },
  {
    id: 'ntc_tag',
    name: 'NTC Thermistor (TAG ventral)',
    module: 'TAG',
    measures: ['skin_temperature_proxy'],
    derived_features: ['skin_temp_c'],
    sampling_hz: 0.1,
    reliability_by_context: { gold: 0.40, silver: 0.30, bronze: 0.15, rejected: 0 },
    requires_mat: false,
    requires_tag: true,
    requires_immobility: false,
    min_contact_quality: 0.4,
    component_ref: 'NTC 10k 0402',
    power_ua_active: 10,
    power_ua_sleep: 0,
  },
  {
    id: 'bme280_mat',
    name: 'Environmental Sensor (MAT)',
    module: 'MAT',
    measures: ['ambient_temperature', 'humidity', 'pressure'],
    derived_features: ['temp_c', 'humidity_pct', 'pressure_hpa'],
    sampling_hz: 0.017,
    reliability_by_context: { gold: 0.99, silver: 0.99, bronze: 0.99, rejected: 0.95 },
    requires_mat: true,
    requires_tag: false,
    requires_immobility: false,
    min_contact_quality: 0,
    component_ref: 'BME280',
    power_ua_active: 714,
    power_ua_sleep: 0.1,
  },
  {
    id: 'gps_tag',
    name: 'GNSS Module (TAG dorsal)',
    module: 'TAG',
    measures: ['position', 'speed', 'distance'],
    derived_features: ['lat', 'lon', 'speed_ms', 'distance_session_m', 'copresence_flag'],
    sampling_hz: 1,
    reliability_by_context: { gold: 0.95, silver: 0.90, bronze: 0.60, rejected: 0.1 },
    requires_mat: false,
    requires_tag: true,
    requires_immobility: false,
    min_contact_quality: 0,
    component_ref: 'Quectel L76K',
    power_ua_active: 26000,
    power_ua_sleep: 7,
  },
];

export function getSensor(id: string): SensorSpec | undefined {
  return SENSOR_REGISTRY.find((s) => s.id === id);
}

export function getSensorsForModule(module: 'MAT' | 'TAG'): SensorSpec[] {
  return SENSOR_REGISTRY.filter((s) => s.module === module);
}

export function getRequiredSensors(feature: string): SensorSpec[] {
  return SENSOR_REGISTRY.filter(
    (s) => s.measures.includes(feature) || s.derived_features.includes(feature),
  );
}
