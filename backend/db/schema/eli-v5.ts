import { pgTable, text, timestamp, date, integer, real, boolean, jsonb, serial, index } from 'drizzle-orm/pg-core';

// ─── Dog Sub-Baselines ────────────────────────────────────────────

export const dogSubBaselines = pgTable('dog_sub_baselines', {
  dogId: text('dog_id').notNull(),
  slot: text('slot').notNull(), // deep_rest_mat, light_rest_mat, owner_present, owner_absent, daytime_active
  rrMean: real('rr_mean'),
  rrStd: real('rr_std'),
  activityMean: real('activity_mean'),
  activityStd: real('activity_std'),
  matMinutesMean: real('mat_minutes_mean'),
  vocalRateMean: real('vocal_rate_mean'),
  // v6 additions (migration 0004)
  rrVariabilityMean: real('rr_variability_mean'),
  rrVariabilityStd: real('rr_variability_std'),
  activityVariabilityMean: real('activity_variability_mean'),
  activityVariabilityStd: real('activity_variability_std'),
  recoveryTimeMean: real('recovery_time_mean'),
  recoveryTimeStd: real('recovery_time_std'),
  recoverySampleCount: integer('recovery_sample_count').default(0),
  recoveryTrend4wPct: real('recovery_trend_4w_pct'),
  recoveryLastUpdated: timestamp('recovery_last_updated', { withTimezone: true }),
  sampleCount: integer('sample_count').default(0),
  confidence: real('confidence').default(0),
  lastUpdated: timestamp('last_updated', { withTimezone: true }),
}, (table) => [
  // Composite primary key emulated via unique index
  index('idx_sub_baselines_dog_slot').on(table.dogId, table.slot),
]);

// ─── Recovery Events (v6 — migration 0004) ────────────────────────
export const recoveryEvents = pgTable('recovery_events', {
  id: serial('id').primaryKey(),
  dogId: text('dog_id').notNull(),
  slot: text('slot').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  returnedToBaselineAt: timestamp('returned_to_baseline_at', { withTimezone: true }).notNull(),
  recoveryMinutes: real('recovery_minutes').notNull(),
  peakArousal: real('peak_arousal'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_recovery_events_dog_time').on(table.dogId, table.returnedToBaselineAt),
]);

// ─── Anticipation Events (v6 — migration 0004) ────────────────────
export const anticipationEvents = pgTable('anticipation_events', {
  id: serial('id').primaryKey(),
  dogId: text('dog_id').notNull(),
  eventType: text('event_type').notNull(),
  predictedEventTime: timestamp('predicted_event_time', { withTimezone: true }).notNull(),
  preEventWindowStart: timestamp('pre_event_window_start', { withTimezone: true }).notNull(),
  meanPreEventOdba: real('mean_pre_event_odba'),
  meanBaselineOdba: real('mean_baseline_odba'),
  activityRatio: real('activity_ratio'),
  thresholdMet: boolean('threshold_met').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_anticipation_events_dog_time').on(table.dogId, table.predictedEventTime),
]);

// ─── Baseline Drift Monitor ──────────────────────────────────────

export const baselineDriftMonitor = pgTable('baseline_drift_monitor', {
  dogId: text('dog_id').primaryKey(),
  longTermRrMean: real('long_term_rr_mean'),
  longTermActivityMean: real('long_term_activity_mean'),
  longTermMatMinutesMean: real('long_term_mat_minutes_mean'),
  currentRrMean: real('current_rr_mean'),
  currentActivityMean: real('current_activity_mean'),
  rrDriftSigma: real('rr_drift_sigma').default(0),
  activityDriftSigma: real('activity_drift_sigma').default(0),
  driftSignificant: boolean('drift_significant').default(false),
  driftStartDate: date('drift_start_date'),
  baselineFrozen: boolean('baseline_frozen').default(false),
  freezeDate: date('freeze_date'),
  freezeReason: text('freeze_reason'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Walk Quality ─────────────────────────────────────────────────

export const walkQuality = pgTable('walk_quality', {
  id: serial('id').primaryKey(),
  dogId: text('dog_id').notNull(),
  walkDate: date('walk_date').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  distanceKm: real('distance_km'),
  durationMinutes: real('duration_minutes'),
  exerciseScore: real('exercise_score'),
  explorationScore: real('exploration_score'),
  socialScore: real('social_score'),
  wqi: real('wqi'),
  sniffingEvents: integer('sniffing_events'),
  copresenceCount: integer('copresence_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_walk_quality_dog_date').on(table.dogId, table.walkDate),
]);

// ─── Routine Stability ────────────────────────────────────────────

export const routineStability = pgTable('routine_stability', {
  dogId: text('dog_id').notNull(),
  date: date('date').notNull(),
  activityPattern: jsonb('activity_pattern'),
  matPattern: jsonb('mat_pattern'),
  walkPattern: jsonb('walk_pattern'),
  rsi: real('rsi'),
  rsiTrend: text('rsi_trend'), // stable, declining, improving
  routineBreakDetected: boolean('routine_break_detected').default(false),
}, (table) => [
  index('idx_routine_stability_dog_date').on(table.dogId, table.date),
]);

// ─── User Config ──────────────────────────────────────────────────

export const userConfig = pgTable('user_config', {
  userId: text('user_id').notNull(),
  dogId: text('dog_id').notNull(),
  configKey: text('config_key').notNull(),
  configValue: jsonb('config_value').notNull(),
  source: text('source'), // system, breed, learned, user
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
