import { pgTable, text, timestamp, date, integer, real, serial, jsonb, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';

// ─── Dataset Governance ─────────────────────────────────────────────

export const datasetRegistry = pgTable('dataset_registry', {
  datasetId: text('dataset_id').primaryKey(),
  name: text('name').notNull(),
  owner: text('owner'),
  licenseId: text('license_id').notNull(),
  licenseUrl: text('license_url'),
  sourceUrl: text('source_url').notNull(),
  refreshPolicy: text('refresh_policy').notNull(), // 'static', 'monthly', 'weekly', 'manual'
  ingestionStatus: text('ingestion_status').notNull().default('planned'), // 'planned', 'active', 'blocked', 'deprecated'
  attributionText: text('attribution_text').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const datasetVersions = pgTable('dataset_versions', {
  datasetId: text('dataset_id').notNull().references(() => datasetRegistry.datasetId, { onDelete: 'cascade' }),
  versionTag: text('version_tag').notNull(),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).defaultNow().notNull(),
  sourceLastUpdated: date('source_last_updated'),
  checksumSha256: text('checksum_sha256').notNull(),
  recordCount: integer('record_count'),
  notes: text('notes'),
}, (table) => [
  primaryKey({ columns: [table.datasetId, table.versionTag] }),
]);

// ─── VBO Breed Canonical ────────────────────────────────────────────

export const breedCanonical = pgTable('breed_canonical', {
  vboId: text('vbo_id').primaryKey(),
  label: text('label').notNull(),
  displayName: text('display_name').notNull(),
  breedSlug: text('breed_slug').notNull().unique(),
  synonyms: jsonb('synonyms').default([]),
  fciNumber: integer('fci_number'),
  provenance: jsonb('provenance').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── IMU Activity Profiles (Behavior Dataset) ──────────────────────

export const imuActivityProfiles = pgTable('imu_activity_profiles', {
  activityLabel: text('activity_label').primaryKey(),
  featureStats: jsonb('feature_stats').notNull(),
  placement: text('placement').notNull(), // 'collar' or 'harness'
  sourceDataset: text('source_dataset').references(() => datasetRegistry.datasetId),
  sampleCount: integer('sample_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const imuDiscriminationThresholds = pgTable('imu_discrimination_thresholds', {
  id: serial('id').primaryKey(),
  activityA: text('activity_a').notNull(),
  activityB: text('activity_b').notNull(),
  featureName: text('feature_name').notNull(),
  thresholdValue: real('threshold_value').notNull(),
  confidence: real('confidence').notNull(),
  placement: text('placement').notNull(),
  sourceDataset: text('source_dataset').references(() => datasetRegistry.datasetId),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_discrimination').on(table.activityA, table.activityB, table.featureName, table.placement),
]);

// ─── IMU Shake Filter (Posture Dataset) ─────────────────────────────

export const imuShakeFilter = pgTable('imu_shake_filter', {
  id: serial('id').primaryKey(),
  parameter: text('parameter').notNull().unique(),
  value: jsonb('value').notNull(),
  sourceDataset: text('source_dataset').references(() => datasetRegistry.datasetId),
  confidence: real('confidence').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
