import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Licensed behavioural instrument registries.
 *
 * These tables describe the STRUCTURE of a licensed instrument. They never hold
 * its wording. Under the approved storage split (design option C):
 *
 * - structure, ordering, scale bounds, section ranges and breakpoints live here,
 *   because audit needs them and they are not the protected content;
 * - item text, scale labels and official section titles live in a private
 *   content store, reached at runtime through `contentStoreRef`, and are never
 *   written to this database, to the repository, or to any log.
 *
 * Fidelity is proven without the text: `renderDigest` / `titleRenderDigest` are
 * computed once when the licensed bundle is ingested, then recomputed
 * server-side immediately before each presentation. A mismatch refuses the
 * presentation rather than showing a possibly altered item.
 *
 * No row in this file is personal data. These are content metadata, and a
 * privacy audit must not treat them as subject records.
 *
 * Nothing here authorises production use. `licenseStatus` starts at
 * `not_proven`, so the runtime gate stays closed until written licence
 * evidence exists. Repository fixtures use `demo_only`.
 */

export const instruments = pgTable('instruments', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  ownerOrganisation: varchar('owner_organisation', { length: 255 }).notNull(),

  // Attribution wording required by the licence. This is a legal notice, not
  // instrument content, so it can live here. It is rendered verbatim and is
  // never recomposed, shortened or improved by a model.
  attributionText: text('attribution_text'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const instrumentVersions = pgTable('instrument_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  instrumentId: uuid('instrument_id').notNull().references(() => instruments.id),
  version: varchar('version', { length: 100 }).notNull(),
  locale: varchar('locale', { length: 10 }).notNull(),

  // Pointer into the private content store. Never the content itself.
  contentStoreRef: varchar('content_store_ref', { length: 255 }).notNull(),
  // Digest of the whole ingested bundle: proves which revision was served.
  contentDigest: varchar('content_digest', { length: 64 }).notNull(),

  licenseReference: varchar('license_reference', { length: 255 }),
  licenseStatus: varchar('license_status', { length: 30 }).notNull().default('not_proven'),

  // A translation is a change of wording, and changing validated wording can
  // invalidate an item. A locale whose status is not `official` cannot claim
  // comparability with the instrument's reference norms.
  translationStatus: varchar('translation_status', { length: 30 })
    .notNull()
    .default('unreviewed'),

  expectedItemCount: integer('expected_item_count').notNull(),

  // Contractual bounds, kept traceable at runtime so an overrun is detectable
  // before it happens rather than discovered at audit.
  territoryScope: varchar('territory_scope', { length: 100 }),
  maxUsers: integer('max_users'),
  licenseExpiresAt: timestamp('license_expires_at', { withTimezone: true }),

  activatedAt: timestamp('activated_at', { withTimezone: true }),
  retiredAt: timestamp('retired_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_instrument_version_locale').on(table.instrumentId, table.version, table.locale),
  index('idx_instrument_version_instrument').on(table.instrumentId),
  check(
    'chk_instrument_version_license',
    sql`${table.licenseStatus} IN ('not_proven','granted','expired','revoked','demo_only')`,
  ),
  check(
    'chk_instrument_version_translation',
    sql`${table.translationStatus} IN ('unreviewed','official','back_translated','not_equivalent')`,
  ),
  check('chk_instrument_version_item_count', sql`${table.expectedItemCount} > 0`),
  check(
    'chk_instrument_version_max_users',
    sql`${table.maxUsers} IS NULL OR ${table.maxUsers} > 0`,
  ),
]);

/**
 * Sections as position ranges over the canonical order.
 *
 * Whether the official section title is part of the instrument AS ADMINISTERED
 * is an open licensing question. Announcing a theme before the items of a
 * section may add framing that the reference administration does not have, so
 * `titleIsPartOfInstrument` is false by default and only a written answer from
 * the instrument owner should open it.
 */
export const instrumentSections = pgTable('instrument_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => instrumentVersions.id),
  sectionKey: varchar('section_key', { length: 100 }).notNull(),
  ordinal: integer('ordinal').notNull(),
  firstPosition: integer('first_position').notNull(),
  lastPosition: integer('last_position').notNull(),

  // Digest of the rendered official title. Same mechanism as an item.
  titleRenderDigest: varchar('title_render_digest', { length: 64 }).notNull(),
  titleIsPartOfInstrument: boolean('title_is_part_of_instrument').notNull().default(false),
}, (table) => [
  uniqueIndex('uq_section_version_key').on(table.versionId, table.sectionKey),
  uniqueIndex('uq_section_version_ordinal').on(table.versionId, table.ordinal),
  check('chk_section_bounds', sql`${table.firstPosition} <= ${table.lastPosition}`),
  check('chk_section_ordinal', sql`${table.ordinal} >= 0`),
]);

/**
 * Items: structure only. `itemKey` is opaque and `renderDigest` stands in for
 * the wording. There is deliberately no text column on this table.
 *
 * `canonicalPosition` is the administration order. It is a property of the
 * instrument version and never a function of the respondent: no column here
 * references a user, a dog or any context, which makes order invariance
 * verifiable by inspecting the schema rather than only by testing behaviour.
 */
export const instrumentItems = pgTable('instrument_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => instrumentVersions.id),

  itemKey: varchar('item_key', { length: 100 }).notNull(),
  subscaleKey: varchar('subscale_key', { length: 100 }),
  canonicalPosition: integer('canonical_position').notNull(),

  scaleType: varchar('scale_type', { length: 30 }).notNull(),
  scaleMin: integer('scale_min').notNull(),
  scaleMax: integer('scale_max').notNull(),
  allowsNotApplicable: boolean('allows_not_applicable').notNull().default(false),
  reverseScored: boolean('reverse_scored').notNull().default(false),

  renderDigest: varchar('render_digest', { length: 64 }).notNull(),
}, (table) => [
  uniqueIndex('uq_instrument_item').on(table.versionId, table.itemKey),
  uniqueIndex('uq_instrument_item_position').on(table.versionId, table.canonicalPosition),
  check('chk_instrument_item_scale', sql`${table.scaleMin} < ${table.scaleMax}`),
  check('chk_instrument_item_position', sql`${table.canonicalPosition} >= 1`),
]);

/**
 * Allowed cut points — a whitelist, so an illegal segmentation is
 * inexpressible rather than merely discouraged.
 *
 * `authority` records, cut point by cut point, whether the instrument owner
 * supplied it or EMOPET proposed it. An EMOPET-proposed cut point is a decision
 * about how a validated instrument is administered and must be submitted for
 * approval, not quietly shipped.
 *
 * `breakpointSetVersion` lets the set evolve without making past
 * administrations incomparable: an administration records the set it actually
 * experienced.
 */
export const instrumentBreakpoints = pgTable('instrument_breakpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => instrumentVersions.id),

  // A cut is allowed AFTER this canonical position.
  afterPosition: integer('after_position').notNull(),
  breakpointKind: varchar('breakpoint_kind', { length: 30 }).notNull(),
  authority: varchar('authority', { length: 30 }).notNull().default('emopet_proposed'),
  approvalReference: varchar('approval_reference', { length: 255 }),
  rationale: jsonb('rationale').default({}),
  breakpointSetVersion: integer('breakpoint_set_version').notNull().default(1),
}, (table) => [
  uniqueIndex('uq_breakpoint').on(
    table.versionId,
    table.breakpointSetVersion,
    table.afterPosition,
  ),
  check(
    'chk_breakpoint_kind',
    sql`${table.breakpointKind} IN ('section_boundary','intra_section')`,
  ),
  check(
    'chk_breakpoint_authority',
    sql`${table.authority} IN ('licensed','emopet_proposed','emopet_approved')`,
  ),
  check('chk_breakpoint_position', sql`${table.afterPosition} >= 1`),
]);

/**
 * Administration policy: the configuration surface that lets administration
 * mode change without a code change.
 *
 * Two design rules are carried by this table.
 *
 * 1. `adaptiveSignals` is a CLOSED list. Session sizing may only read the
 *    app-behaviour signals named here. No sensor or inference field is
 *    admissible: sensor data must not choose a cut, the moment of a section, or
 *    its context. An unknown key is a loud failure, never a silent fallback.
 *
 * 2. `maxScientificUseStatus` is a CEILING, not a verdict. Because the
 *    respondent may freely chain sessions, the real shape of an administration
 *    is only known when it closes, so the effective status is computed then and
 *    capped by this value. A respondent who answers in one sitting is not
 *    penalised by the policy they happened to start under; and while no written
 *    approval exists, no policy carries `scoring_allowed`, so no shape can
 *    produce a score presented as equivalent to the standard administration.
 */
export const instrumentAdministrationPolicies = pgTable('instrument_administration_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  versionId: uuid('version_id').notNull().references(() => instrumentVersions.id),
  policyKey: varchar('policy_key', { length: 100 }).notNull(),
  policyVersion: integer('policy_version').notNull().default(1),

  administrationMode: varchar('administration_mode', { length: 30 }).notNull(),
  orderStrategy: varchar('order_strategy', { length: 40 }).notNull().default('canonical'),

  // Session sizing targets a DURATION, not a count.
  targetSessionMinutes: integer('target_session_minutes').notNull().default(3),
  minItemsPerSession: integer('min_items_per_session').notNull().default(5),
  maxItemsPerSession: integer('max_items_per_session').notNull().default(15),
  adaptiveSizing: boolean('adaptive_sizing').notNull().default(true),
  adaptiveSignals: jsonb('adaptive_signals')
    .notNull()
    .default(['median_session_duration', 'completion_rate', 'pause_frequency']),

  allowChaining: boolean('allow_chaining').notNull().default(true),
  maxSessions: integer('max_sessions'),
  maxWindowHours: integer('max_window_hours').notNull(),
  maxSessionGapHours: integer('max_session_gap_hours'),
  minInterItemMs: integer('min_inter_item_ms').notNull().default(800),
  allowResume: boolean('allow_resume').notNull().default(true),
  allowRevision: boolean('allow_revision').notNull().default(false),

  allowMidSessionPause: boolean('allow_mid_session_pause').notNull().default(true),
  maxRemindersPerMissedSession: integer('max_reminders_per_missed_session')
    .notNull()
    .default(2),
  deadlineWarningHoursBefore: integer('deadline_warning_hours_before').notNull().default(48),
  deadlineWarningCountsAsReminder: boolean('deadline_warning_counts_as_reminder')
    .notNull()
    .default(true),

  // Fatigue handling. `silent_flag` is the only mode with no neutrality risk,
  // because a pause offered in reaction to fast or uniform answering is itself a
  // comment on those answers. It is therefore the default.
  fatigueResponseMode: varchar('fatigue_response_mode', { length: 30 })
    .notNull()
    .default('silent_flag'),

  maxScientificUseStatus: varchar('max_scientific_use_status', { length: 30 }).notNull(),

  approvedBy: varchar('approved_by', { length: 255 }),
  approvalReference: varchar('approval_reference', { length: 255 }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_policy_key_version').on(table.versionId, table.policyKey, table.policyVersion),
  index('idx_policy_version').on(table.versionId),
  check(
    'chk_policy_mode',
    sql`${table.administrationMode} IN ('standardized','progressive','research','unknown')`,
  ),
  check(
    'chk_policy_order_strategy',
    sql`${table.orderStrategy} IN ('canonical','subscale_blocked','licensed_randomized')`,
  ),
  check(
    'chk_policy_use_status',
    sql`${table.maxScientificUseStatus} IN ('unreviewed','scoring_allowed','research_only','not_equivalent')`,
  ),
  check(
    'chk_policy_fatigue_mode',
    sql`${table.fatigueResponseMode} IN ('silent_flag','boundary_offer','immediate_offer')`,
  ),
  check(
    'chk_policy_window',
    sql`${table.maxWindowHours} > 0
      AND ${table.minItemsPerSession} > 0
      AND ${table.minItemsPerSession} <= ${table.maxItemsPerSession}
      AND ${table.targetSessionMinutes} > 0
      AND (${table.maxSessions} IS NULL OR ${table.maxSessions} > 0)
      AND (${table.maxSessionGapHours} IS NULL OR ${table.maxSessionGapHours} > 0)`,
  ),
]);
