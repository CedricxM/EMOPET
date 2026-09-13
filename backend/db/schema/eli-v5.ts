import { pgTable, text, uuid, timestamp, date, integer, doublePrecision, boolean, jsonb, serial, index, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { dogs } from './dogs.js';
import { users } from './users.js';

// ─── Dog Sub-Baselines ────────────────────────────────────────────

export const dogSubBaselines = pgTable('dog_sub_baselines', {
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  slot: text('slot').notNull(), // deep_rest_mat, light_rest_mat, owner_present, owner_absent, daytime_active
  rrMean: doublePrecision('rr_mean'),
  rrStd: doublePrecision('rr_std'),
  activityMean: doublePrecision('activity_mean'),
  activityStd: doublePrecision('activity_std'),
  matMinutesMean: doublePrecision('mat_minutes_mean'),
  vocalRateMean: doublePrecision('vocal_rate_mean'),
  // v6 additions (migration 0004)
  rrVariabilityMean: doublePrecision('rr_variability_mean'),
  rrVariabilityStd: doublePrecision('rr_variability_std'),
  activityVariabilityMean: doublePrecision('activity_variability_mean'),
  activityVariabilityStd: doublePrecision('activity_variability_std'),
  recoveryTimeMean: doublePrecision('recovery_time_mean'),
  recoveryTimeStd: doublePrecision('recovery_time_std'),
  recoverySampleCount: integer('recovery_sample_count').default(0),
  recoveryTrend4wPct: doublePrecision('recovery_trend_4w_pct'),
  recoveryLastUpdated: timestamp('recovery_last_updated', { withTimezone: true }),
  sampleCount: integer('sample_count').default(0),
  confidence: doublePrecision('confidence').default(0),
  lastUpdated: timestamp('last_updated', { withTimezone: true }),
}, (table) => [
  primaryKey({ columns: [table.dogId, table.slot] }),
  check(
    'chk_dog_sub_baselines_slot',
    sql`${table.slot} IN ('deep_rest_mat', 'light_rest_mat', 'owner_present', 'owner_absent', 'daytime_active')`,
  ),
]);

// ─── Recovery Events (v6 — migration 0004) ────────────────────────
export const recoveryEvents = pgTable('recovery_events', {
  id: serial('id').primaryKey(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  slot: text('slot').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  returnedToBaselineAt: timestamp('returned_to_baseline_at', { withTimezone: true }).notNull(),
  recoveryMinutes: doublePrecision('recovery_minutes').notNull(),
  peakArousal: doublePrecision('peak_arousal'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_recovery_events_dog_time').on(table.dogId, table.returnedToBaselineAt.desc()),
  check(
    'chk_recovery_events_slot',
    sql`${table.slot} IN ('deep_rest_mat', 'light_rest_mat', 'owner_present', 'owner_absent', 'daytime_active')`,
  ),
]);

// ─── Anticipation Events (v6 — migration 0004) ────────────────────
export const anticipationEvents = pgTable('anticipation_events', {
  id: serial('id').primaryKey(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  eventType: text('event_type').notNull(),
  predictedEventTime: timestamp('predicted_event_time', { withTimezone: true }).notNull(),
  preEventWindowStart: timestamp('pre_event_window_start', { withTimezone: true }).notNull(),
  meanPreEventOdba: doublePrecision('mean_pre_event_odba'),
  meanBaselineOdba: doublePrecision('mean_baseline_odba'),
  activityRatio: doublePrecision('activity_ratio'),
  thresholdMet: boolean('threshold_met').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_anticipation_events_dog_time').on(table.dogId, table.predictedEventTime.desc()),
  check(
    'chk_anticipation_events_event_type',
    sql`${table.eventType} IN ('owner_departure', 'walk_time', 'meal_time')`,
  ),
]);

// ─── Baseline Drift Monitor ──────────────────────────────────────

export const baselineDriftMonitor = pgTable('baseline_drift_monitor', {
  dogId: uuid('dog_id').primaryKey().references(() => dogs.id),
  longTermRrMean: doublePrecision('long_term_rr_mean'),
  longTermActivityMean: doublePrecision('long_term_activity_mean'),
  longTermMatMinutesMean: doublePrecision('long_term_mat_minutes_mean'),
  currentRrMean: doublePrecision('current_rr_mean'),
  currentActivityMean: doublePrecision('current_activity_mean'),
  rrDriftSigma: doublePrecision('rr_drift_sigma').default(0),
  activityDriftSigma: doublePrecision('activity_drift_sigma').default(0),
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
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  walkDate: date('walk_date').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  distanceKm: doublePrecision('distance_km'),
  durationMinutes: doublePrecision('duration_minutes'),
  exerciseScore: doublePrecision('exercise_score'),
  explorationScore: doublePrecision('exploration_score'),
  socialScore: doublePrecision('social_score'),
  wqi: doublePrecision('wqi'),
  sniffingEvents: integer('sniffing_events'),
  copresenceCount: integer('copresence_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_walk_quality_dog_date').on(table.dogId, table.walkDate),
]);

// ─── Routine Stability ────────────────────────────────────────────

export const routineStability = pgTable('routine_stability', {
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  date: date('date').notNull(),
  activityPattern: jsonb('activity_pattern'),
  matPattern: jsonb('mat_pattern'),
  walkPattern: jsonb('walk_pattern'),
  rsi: doublePrecision('rsi'),
  rsiTrend: text('rsi_trend'), // stable, declining, improving
  routineBreakDetected: boolean('routine_break_detected').default(false),
}, (table) => [
  primaryKey({ columns: [table.dogId, table.date] }),
  check('chk_routine_stability_rsi_trend', sql`${table.rsiTrend} IN ('stable', 'declining', 'improving')`),
]);

// ─── User Config ──────────────────────────────────────────────────

export const userConfig = pgTable('user_config', {
  userId: uuid('user_id').notNull().references(() => users.id),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  configKey: text('config_key').notNull(),
  configValue: jsonb('config_value').notNull(),
  source: text('source'), // system, breed, learned, user
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.dogId, table.configKey] }),
  check('chk_user_config_source', sql`${table.source} IN ('system', 'breed', 'learned', 'user')`),
]);