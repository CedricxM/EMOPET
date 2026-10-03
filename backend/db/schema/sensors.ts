import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, real, integer, bigint, jsonb, boolean, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { devices, dogs } from './dogs.js';
import { users } from './users.js';

export const sensorSummaries = pgTable('sensor_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  ingestionId: uuid('ingestion_id').notNull(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 5 }).notNull(), // MAT, TAG
  firmwareVersionAtIngest: varchar('firmware_version_at_ingest', { length: 20 }),
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
}, (table) => ({
  ingestionIdUnique: uniqueIndex('uq_sensor_summaries_ingestion_id').on(table.ingestionId),
  deviceTimestampIdx: index('idx_sensor_summaries_device_timestamp').on(table.deviceId, table.timestamp),
}));



export const phonePresenceEvents = pgTable('phone_presence_events', {
  eventId: uuid('event_id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  phoneSeen: boolean('phone_seen').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  source: varchar('source', { length: 24 }).notNull(),
}, (table) => [
  uniqueIndex('uq_phone_presence_events_owner_idempotency')
    .on(table.ownerId, table.idempotencyKey),
  index('idx_phone_presence_events_dog_observed')
    .on(table.dogId, table.observedAt, table.receivedAt, table.eventId),
  check(
    'chk_phone_presence_events_idempotency_length',
    sql`char_length(${table.idempotencyKey}) BETWEEN 8 AND 128`,
  ),
  check(
    'chk_phone_presence_events_source',
    sql`${table.source} IN ('phone_passive', 'manual_override')`,
  ),
]);

export const sensorFeatureObservations = pgTable('sensor_feature_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  ingestionId: uuid('ingestion_id').notNull(),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 5 }).notNull(),
  featureKey: varchar('feature_key', { length: 64 }).notNull(),
  value: real('value'),
  observationStatus: varchar('observation_status', { length: 24 }).notNull(),
  nullReason: varchar('null_reason', { length: 48 }),
  featureContractVersion: varchar('feature_contract_version', { length: 80 }).notNull(),
  windowSeconds: integer('window_seconds').notNull(),
  validSeconds: integer('valid_seconds').notNull(),
  qualityState: varchar('quality_state', { length: 16 }),
  firmwareVersionAtIngest: varchar('firmware_version_at_ingest', { length: 20 }),
  transportVersion: integer('transport_version'),
  transportBootSessionId: bigint('transport_boot_session_id', { mode: 'number' }),
  transportSequence: integer('transport_sequence'),
  transportWindowEndMs: bigint('transport_window_end_ms', { mode: 'number' }),
  eventTimeResolution: varchar('event_time_resolution', { length: 32 }),
  clockAnchorDeviceMs: bigint('clock_anchor_device_ms', { mode: 'number' }),
  clockAnchorUtc: timestamp('clock_anchor_utc', { withTimezone: true }),
  eventTimeUncertaintyMs: integer('event_time_uncertainty_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_sensor_feature_observations_ingestion_id').on(table.ingestionId),
  uniqueIndex('uq_sensor_feature_observations_transport_replay').on(
    table.deviceId,
    table.featureKey,
    table.transportBootSessionId,
    table.transportSequence,
  ),
  index('idx_sensor_feature_observations_dog_feature_time').on(
    table.dogId,
    table.featureKey,
    table.observedAt,
  ),
  index('idx_sensor_feature_observations_device_time').on(table.deviceId, table.observedAt),
  check('chk_sensor_feature_observations_source', sql`${table.source} = 'TAG'`),
  check(
    'chk_sensor_feature_observations_feature',
    sql`${table.featureKey} = 'activity_variability'`,
  ),
  check(
    'chk_sensor_feature_observations_contract',
    sql`${table.featureContractVersion} = 'tag-activity-variability-cv30m-v1'`,
  ),
  check('chk_sensor_feature_observations_window', sql`${table.windowSeconds} = 1800`),
  check(
    'chk_sensor_feature_observations_transport_provenance',
    sql`(
      ${table.transportVersion} IS NULL
      AND ${table.transportBootSessionId} IS NULL
      AND ${table.transportSequence} IS NULL
    ) OR (
      ${table.transportVersion} = 1
      AND ${table.transportBootSessionId} BETWEEN 0 AND 4294967295
      AND ${table.transportSequence} BETWEEN 0 AND 65535
    )`,
  ),
  check(
    'chk_sensor_feature_observations_transport_window_end',
    sql`${table.transportWindowEndMs} IS NULL OR ${table.transportWindowEndMs} BETWEEN 0 AND 4294967295`,
  ),
  check(
    'chk_sensor_feature_observations_event_time_provenance',
    sql`(
      ${table.eventTimeResolution} IS NULL
      AND ${table.clockAnchorDeviceMs} IS NULL
      AND ${table.clockAnchorUtc} IS NULL
      AND ${table.eventTimeUncertaintyMs} IS NULL
    ) OR (
      ${table.eventTimeResolution} = 'BOOT_ANCHOR_V1'
      AND ${table.transportBootSessionId} IS NOT NULL
      AND ${table.transportWindowEndMs} IS NOT NULL
      AND ${table.clockAnchorDeviceMs} BETWEEN 0 AND 4294967295
      AND ${table.clockAnchorUtc} IS NOT NULL
      AND ${table.eventTimeUncertaintyMs} >= 0
    )`,
  ),
  check(
    'chk_sensor_feature_observations_valid_seconds',
    sql`${table.validSeconds} >= 0 AND ${table.validSeconds} <= 1800`,
  ),
  check(
    'chk_sensor_feature_observations_quality',
    sql`${table.qualityState} IS NULL OR ${table.qualityState} IN ('VALID', 'DEGRADED', 'SUPPRESSED')`,
  ),
  check(
    'chk_sensor_feature_observations_observed_quality',
    sql`${table.observationStatus} <> 'OBSERVED' OR ${table.qualityState} IS NULL OR ${table.qualityState} <> 'SUPPRESSED'`,
  ),
  check(
    'chk_sensor_feature_observations_status',
    sql`${table.observationStatus} IN ('OBSERVED', 'NOT_OBSERVED')`,
  ),
  check(
    'chk_sensor_feature_observations_shape',
    sql`(
      ${table.observationStatus} = 'OBSERVED'
      AND ${table.value} IS NOT NULL
      AND ${table.value} >= 0
      AND ${table.nullReason} IS NULL
      AND ${table.validSeconds} >= 900
    ) OR (
      ${table.observationStatus} = 'NOT_OBSERVED'
      AND ${table.value} IS NULL
      AND (
        (${table.nullReason} = 'INSUFFICIENT_COVERAGE' AND ${table.validSeconds} < 900)
        OR
        (${table.nullReason} = 'MEAN_BELOW_DIVISION_GUARD' AND ${table.validSeconds} >= 900)
      )
    )`,
  ),
]);

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
