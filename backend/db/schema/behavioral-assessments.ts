import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  real,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  unique,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { dogs } from './dogs.js';
import { users } from './users.js';

/**
 * Behavioural instrument data is intentionally stored separately from sensor
 * observations and ELI outputs.
 *
 * Important rules:
 * - Do not store licensed questionnaire wording here. `itemKey` is an opaque
 *   identifier supplied by the licensed instrument implementation.
 * - Owner report, sensor observation and model inference are different evidence
 *   classes and must remain distinguishable in provenance.
 * - A progressive/adaptive administration mode must never be assumed equivalent
 *   to the validated/standard administration. `scientificUseStatus` is the gate.
 * - Missing / skipped / not-applicable / not-observed responses are preserved
 *   explicitly rather than silently imputed or coerced to zero.
 * - Household composition used for applicability is snapshotted on the
 *   assessment; mutable present-day dog/profile state is not retrospective truth.
 */

export const behavioralAssessments = pgTable('behavioral_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  respondentUserId: uuid('respondent_user_id').references(() => users.id, { onDelete: 'set null' }),
  respondentRole: varchar('respondent_role', { length: 30 }).notNull().default('owner'),

  instrumentCode: varchar('instrument_code', { length: 50 }).notNull(),
  instrumentVersion: varchar('instrument_version', { length: 100 })
    .notNull()
    .default('UNVERSIONED'),
  licenseReference: varchar('license_reference', { length: 255 }),

  administrationMode: varchar('administration_mode', { length: 30 })
    .notNull()
    .default('standardized'),
  scientificUseStatus: varchar('scientific_use_status', { length: 30 })
    .notNull()
    .default('unreviewed'),
  status: varchar('status', { length: 20 }).notNull().default('in_progress'),

  expectedItemCount: integer('expected_item_count'),
  answeredItemCount: integer('answered_item_count').notNull().default(0),

  // Assessment-time context only. This is applicability provenance, not a
  // behavioural inference and not a replacement for instrument scoring rules.
  householdDogCount: integer('household_dog_count'),
  householdContextSource: varchar('household_context_source', { length: 30 })
    .notNull()
    .default('unknown'),
  householdContextRecordedAt: timestamp('household_context_recorded_at', { withTimezone: true }),

  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_behavioral_assessment_dog').on(table.dogId),
  index('idx_behavioral_assessment_instrument').on(table.instrumentCode),
  unique('uq_behavioral_assessment_instrument_binding').on(
    table.id,
    table.instrumentCode,
    table.instrumentVersion,
  ),
  check(
    'chk_behavioral_assessment_respondent_role',
    sql`${table.respondentRole} IN ('owner','caregiver','trainer','veterinarian','researcher','other')`,
  ),
  check(
    'chk_behavioral_assessment_mode',
    sql`${table.administrationMode} IN ('standardized','progressive','research','unknown')`,
  ),
  check(
    'chk_behavioral_assessment_scientific_use',
    sql`${table.scientificUseStatus} IN ('unreviewed','scoring_allowed','research_only','not_equivalent')`,
  ),
  check(
    'chk_behavioral_assessment_status',
    sql`${table.status} IN ('in_progress','complete','abandoned')`,
  ),
  check(
    'chk_behavioral_assessment_counts',
    sql`(${table.expectedItemCount} IS NULL OR ${table.expectedItemCount} >= 0) AND ${table.answeredItemCount} >= 0`,
  ),
  check(
    'chk_behavioral_assessment_household_context_source',
    sql`${table.householdContextSource} IN ('respondent_reported','research_record','profile_snapshot','unknown')`,
  ),
  check(
    'chk_behavioral_assessment_household_context',
    sql`(
      ${table.householdDogCount} IS NULL
      AND ${table.householdContextSource} = 'unknown'
      AND ${table.householdContextRecordedAt} IS NULL
    ) OR (
      ${table.householdDogCount} >= 1
      AND ${table.householdContextSource} IN ('respondent_reported','research_record','profile_snapshot')
      AND ${table.householdContextRecordedAt} IS NOT NULL
    )`,
  ),
]);

export const behavioralResponses = pgTable('behavioral_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => behavioralAssessments.id, { onDelete: 'cascade' }),

  // Opaque item identifier only. Never persist licensed item wording here.
  itemKey: varchar('item_key', { length: 100 }).notNull(),
  responseStatus: varchar('response_status', { length: 30 }).notNull().default('answered'),
  responseValue: integer('response_value'),
  scaleMin: integer('scale_min').notNull().default(0),
  scaleMax: integer('scale_max').notNull().default(4),

  presentedAt: timestamp('presented_at', { withTimezone: true }),
  answeredAt: timestamp('answered_at', { withTimezone: true }),

  // Context is provenance, not a substitute for the instrument response.
  presentationContext: jsonb('presentation_context').default({}),
  provenance: jsonb('provenance').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_behavioral_response_assessment_item').on(table.assessmentId, table.itemKey),
  index('idx_behavioral_response_assessment').on(table.assessmentId),
  check(
    'chk_behavioral_response_status',
    sql`${table.responseStatus} IN ('answered','not_applicable','not_observed','skipped','missing')`,
  ),
  check(
    'chk_behavioral_response_scale',
    sql`${table.scaleMin} <= ${table.scaleMax} AND (
      (${table.responseStatus} = 'answered' AND ${table.responseValue} IS NOT NULL AND ${table.responseValue} BETWEEN ${table.scaleMin} AND ${table.scaleMax})
      OR
      (${table.responseStatus} IN ('not_applicable','not_observed','skipped','missing') AND ${table.responseValue} IS NULL)
    )`,
  ),
]);

export const behavioralFactorScores = pgTable('behavioral_factor_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => behavioralAssessments.id, { onDelete: 'cascade' }),
  factorKey: varchar('factor_key', { length: 100 }).notNull(),
  score: real('score').notNull(),
  scoringMethod: varchar('scoring_method', { length: 100 }).notNull(),
  scoringVersion: varchar('scoring_version', { length: 100 }),

  // False by default: scientific approval must be explicit before this can
  // become an ELI prior.
  eligibleForEliPrior: boolean('eligible_for_eli_prior').notNull().default(false),
  provenance: jsonb('provenance').default({}),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_behavioral_factor_assessment_factor').on(table.assessmentId, table.factorKey),
  unique('uq_behavioral_factor_binding').on(table.id, table.assessmentId, table.factorKey),
  index('idx_behavioral_factor_assessment').on(table.assessmentId),
]);

/**
 * Scientific authority for a behavioural-instrument factor -> ELI prior mapping.
 *
 * Instrument evidence can exist without any ELI mapping authority. HOLD and
 * RESEARCH_ONLY records remain governance evidence only. An active prior must
 * bind to an exact reviewed GO tuple.
 */
export const eliBehavioralMappingAuthorities = pgTable('eli_behavioral_mapping_authorities', {
  id: uuid('id').primaryKey().defaultRandom(),

  instrumentCode: varchar('instrument_code', { length: 50 }).notNull(),
  instrumentVersion: varchar('instrument_version', { length: 100 })
    .notNull()
    .default('UNVERSIONED'),
  sourceInstrumentCode: varchar('source_instrument_code', { length: 50 }).notNull(),
  sourceInstrumentVersion: varchar('source_instrument_version', { length: 100 })
    .notNull()
    .default('UNVERSIONED'),
  sourceFactorKey: varchar('source_factor_key', { length: 100 }).notNull(),
  targetPriorKey: varchar('target_prior_key', { length: 100 }).notNull(),
  algorithmVersion: varchar('algorithm_version', { length: 100 }).notNull(),
  authorityVersion: varchar('authority_version', { length: 100 }).notNull(),

  evidenceReference: varchar('evidence_reference', { length: 500 }).notNull(),
  disposition: varchar('disposition', { length: 20 }).notNull().default('HOLD'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewerRole: varchar('reviewer_role', { length: 100 }),
  reason: varchar('reason', { length: 1000 }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_eli_behavioral_mapping_authority_natural').on(
    table.instrumentCode,
    table.instrumentVersion,
    table.sourceFactorKey,
    table.targetPriorKey,
    table.algorithmVersion,
    table.authorityVersion,
  ),
  unique('uq_eli_behavioral_mapping_authority_binding').on(
    table.id,
    table.instrumentCode,
    table.instrumentVersion,
    table.sourceFactorKey,
    table.targetPriorKey,
    table.algorithmVersion,
    table.disposition,
  ),
  check(
    'chk_eli_behavioral_mapping_authority_disposition',
    sql`${table.disposition} IN ('HOLD','RESEARCH_ONLY','GO','RETIRED')`,
  ),
  check(
    'chk_eli_behavioral_mapping_authority_go_review',
    sql`${table.disposition} <> 'GO' OR (
      ${table.reviewedAt} IS NOT NULL
      AND ${table.reviewerRole} IS NOT NULL
      AND length(trim(${table.reviewerRole})) > 0
      AND length(trim(${table.evidenceReference})) > 0
    )`,
  ),
]);

/**
 * Explicit bridge between behavioural assessment evidence and ELI.
 * Nothing from C-BARQ (or any future instrument) should silently mutate ELI.
 * Every prior is versioned, attributable and can be retired/rejected.
 *
 * Active status is fail-closed: an active prior must bind to the exact factor
 * score, assessment instrument/version and reviewed GO mapping authority.
 */
export const eliBehavioralPriors = pgTable('eli_behavioral_priors', {
  id: uuid('id').primaryKey().defaultRandom(),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => behavioralAssessments.id),
  factorScoreId: uuid('factor_score_id')
    .references(() => behavioralFactorScores.id),

  sourceInstrumentCode: varchar('source_instrument_code', { length: 50 }).notNull(),
  sourceInstrumentVersion: varchar('source_instrument_version', { length: 100 })
    .notNull()
    .default('UNVERSIONED'),
  sourceFactorKey: varchar('source_factor_key', { length: 100 }).notNull(),
  targetPriorKey: varchar('target_prior_key', { length: 100 }).notNull(),
  priorValue: real('prior_value').notNull(),
  confidence: real('confidence').notNull(),
  algorithmVersion: varchar('algorithm_version', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('candidate'),

  mappingAuthorityId: uuid('mapping_authority_id'),
  mappingAuthorityDisposition: varchar('mapping_authority_disposition', { length: 20 }),

  rationale: jsonb('rationale').default({}),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_eli_behavioral_prior_dog').on(table.dogId),
  index('idx_eli_behavioral_prior_assessment').on(table.assessmentId),
  check('chk_eli_behavioral_prior_confidence', sql`${table.confidence} BETWEEN 0 AND 1`),
  check(
    'chk_eli_behavioral_prior_status',
    sql`${table.status} IN ('candidate','active','retired','rejected')`,
  ),
  check(
    'chk_eli_behavioral_prior_mapping_disposition',
    sql`${table.mappingAuthorityDisposition} IS NULL OR ${table.mappingAuthorityDisposition} IN ('HOLD','RESEARCH_ONLY','GO','RETIRED')`,
  ),
  check(
    'chk_eli_behavioral_prior_mapping_binding_pair',
    sql`(
      ${table.mappingAuthorityId} IS NULL AND ${table.mappingAuthorityDisposition} IS NULL
    ) OR (
      ${table.mappingAuthorityId} IS NOT NULL AND ${table.mappingAuthorityDisposition} IS NOT NULL
    )`,
  ),
  check(
    'chk_eli_behavioral_prior_active_authority',
    sql`${table.status} <> 'active' OR (
      ${table.factorScoreId} IS NOT NULL
      AND ${table.mappingAuthorityId} IS NOT NULL
      AND ${table.mappingAuthorityDisposition} = 'GO'
    )`,
  ),
  foreignKey({
    name: 'fk_eli_behavioral_prior_factor_binding',
    columns: [
      table.factorScoreId,
      table.assessmentId,
      table.sourceFactorKey,
    ],
    foreignColumns: [
      behavioralFactorScores.id,
      behavioralFactorScores.assessmentId,
      behavioralFactorScores.factorKey,
    ],
  }),
  foreignKey({
    name: 'fk_eli_behavioral_prior_assessment_instrument',
    columns: [
      table.assessmentId,
      table.sourceInstrumentCode,
      table.sourceInstrumentVersion,
    ],
    foreignColumns: [
      behavioralAssessments.id,
      behavioralAssessments.instrumentCode,
      behavioralAssessments.instrumentVersion,
    ],
  }),
  foreignKey({
    name: 'fk_eli_behavioral_prior_mapping_authority',
    columns: [
      table.mappingAuthorityId,
      table.sourceInstrumentCode,
      table.sourceInstrumentVersion,
      table.sourceFactorKey,
      table.targetPriorKey,
      table.algorithmVersion,
      table.mappingAuthorityDisposition,
    ],
    foreignColumns: [
      eliBehavioralMappingAuthorities.id,
      eliBehavioralMappingAuthorities.instrumentCode,
      eliBehavioralMappingAuthorities.instrumentVersion,
      eliBehavioralMappingAuthorities.sourceFactorKey,
      eliBehavioralMappingAuthorities.targetPriorKey,
      eliBehavioralMappingAuthorities.algorithmVersion,
      eliBehavioralMappingAuthorities.disposition,
    ],
  }),
]);

/**
 * Separate consent record for future research use of longitudinal EMOPET data.
 * Product consent and research-data consent must not be conflated.
 */
export const researchDataConsents = pgTable('research_data_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),
  consentVersion: varchar('consent_version', { length: 100 }).notNull(),
  scope: varchar('scope', { length: 30 }).notNull(),
  governanceReference: varchar('governance_reference', { length: 255 }),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
}, (table) => [
  index('idx_research_consent_dog').on(table.dogId),
  index('idx_research_consent_user').on(table.userId),
  check(
    'chk_research_consent_scope',
    sql`${table.scope} IN ('aggregate','deidentified','study_specific')`,
  ),
]);
