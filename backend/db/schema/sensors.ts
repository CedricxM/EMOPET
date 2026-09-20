import { pgTable, uuid, varchar, timestamp, real, integer, jsonb } from 'drizzle-orm/pg-core';
import { dogs } from './dogs.js';

export const sensorSummaries = pgTable('sensor_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 5 }).notNull(), // MAT, TAG
  matPresenceMinutes: real('mat_presence_minutes'),
  respiratoryRateMean: real('respiratory_rate_mean'),
  respiratoryRateStd: real('respiratory_rate_std'),
  respiratoryRateConfidence: real('respiratory_rate_confidence'),
  weightKg: real('weight_kg'),
  positionChanges: integer('position_changes'),
  activityMinutes: real('activity_minutes'),
  distanceKm: real('distance_km'),
  vocalEvents: integer('vocal_events'),
  vocalEnergyMean: real('vocal_energy_mean'),
  postureDistribution: jsonb('posture_distribution'),
  agitationEvents: integer('agitation_events'),
  temperatureC: real('temperature_c'),
  humidityPct: real('humidity_pct'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const eliStates = pgTable('eli_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  arousal: real('arousal').notNull(),
  valence: real('valence').notNull(),
  load: real('load').notNull(),
  confidence: real('confidence').notNull(),
  gateStatus: varchar('gate_status', { length: 10 }).notNull(), // PUBLISH, DEGRADE, REJECT
  sensorReliability: jsonb('sensor_reliability').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const baselines = pgTable('baselines', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id).unique(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  validHours: real('valid_hours').notNull().default(0),
  established: integer('established').notNull().default(0),
  metrics: jsonb('metrics').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
