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
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { behavioralAssessments } from './behavioral-assessments.js';
import { instrumentBreakpoints } from './instruments.js';

/**
 * Runtime of an instrument administration: sessions and the fidelity audit
 * journal.
 *
 * This file is separate from `instruments.ts` on purpose. The registries are
 * referenced by `behavioral_assessments` (policy, version), while the tables
 * here reference `behavioral_assessments` in turn. Splitting them keeps every
 * schema import one-directional instead of circular.
 *
 * Neither table holds personal data beyond the assessment link, and neither
 * holds a dog or user column: they are transitive descendants of a dog through
 * `behavioral_assessments.dog_id`, which is how erasure must reach them.
 */

export const administrationSessions = pgTable('administration_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => behavioralAssessments.id, { onDelete: 'cascade' }),
  sessionIndex: integer('session_index').notNull(),
  state: varchar('state', { length: 30 }).notNull().default('planned'),

  // Opaque item keys only.
  plannedItemKeys: jsonb('planned_item_keys').notNull(),
  plannedItemCount: integer('planned_item_count').notNull(),

  openedAt: timestamp('opened_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),

  // Which segmentation actually produced this session.
  breakpointSetVersion: integer('breakpoint_set_version').notNull(),
  openedAtBreakpointId: uuid('opened_at_breakpoint_id')
    .references(() => instrumentBreakpoints.id),
  closedAtBreakpointId: uuid('closed_at_breakpoint_id')
    .references(() => instrumentBreakpoints.id),

  // Values of the app-behaviour signals used for sizing. Only keys drawn from
  // the policy's closed `adaptiveSignals` list may appear here; a sensor or
  // inference key is rejected before the write.
  sizingSignals: jsonb('sizing_signals').default({}),
  sizingDecision: varchar('sizing_decision', { length: 30 }),

  // Chaining and resume. Accepting "a few more" keeps the same session row and
  // extends it, which is what lets a one-sitting administration be recognised
  // as such when the effective scientific status is computed at close.
  chainedFromSessionId: uuid('chained_from_session_id'),
  resumedAtItemKey: varchar('resumed_at_item_key', { length: 100 }),
  midSessionPauseCount: integer('mid_session_pause_count').notNull().default(0),

  // Reminders and deadline. A pause is not a missed session and consumes no
  // reminder quota: only a session that was invited and never opened does.
  reminderCount: integer('reminder_count').notNull().default(0),
  deadlineWarningSentAt: timestamp('deadline_warning_sent_at', { withTimezone: true }),

  // Attests that no sensor data entered the decision to invite, to size, or to
  // cut — and that no salient sensor observation was shown shortly before.
  quietWindowProof: jsonb('quiet_window_proof').default({}),
  invitationChannel: varchar('invitation_channel', { length: 30 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_session_assessment_index').on(table.assessmentId, table.sessionIndex),
  index('idx_session_assessment').on(table.assessmentId),
  check(
    'chk_session_state',
    sql`${table.state} IN ('planned','invited','open','paused','closed','expired','abandoned')`,
  ),
  check(
    'chk_session_sizing',
    sql`${table.sizingDecision} IS NULL OR ${table.sizingDecision} IN
        ('default','adapted_shorter','adapted_longer','owner_chained')`,
  ),
  // The two-reminder cap is a promise made to the respondent, so it is enforced
  // at the database boundary rather than left to the notification layer. The
  // literal is deliberate: raising it requires revising this constraint.
  check('chk_session_reminder_cap', sql`${table.reminderCount} BETWEEN 0 AND 2`),
  check(
    'chk_session_counts',
    sql`${table.plannedItemCount} > 0 AND ${table.midSessionPauseCount} >= 0`,
  ),
  check('chk_session_index', sql`${table.sessionIndex} >= 1`),
]);

/**
 * Append-only fidelity audit journal.
 *
 * It holds no item text and no generated conversational text. Fidelity is
 * proven by digests, and framing is proven by a template identifier plus a
 * digest, which keeps the journal compatible with the rule that AI
 * conversational content is never durably persisted.
 *
 * The segmentation covariates are the point of this table. Because the item
 * order is identical for every respondent, segmentation is the only dimension
 * that varies; recording the segmentation each item actually experienced turns
 * that variability into an analysable covariate instead of uncontrolled noise.
 */
export const instrumentAdministrationEvents = pgTable('instrument_administration_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => behavioralAssessments.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => administrationSessions.id, {
    onDelete: 'cascade',
  }),
  sequenceIndex: integer('sequence_index').notNull(),

  eventType: varchar('event_type', { length: 40 }).notNull(),
  itemKey: varchar('item_key', { length: 100 }),

  // What was ACTUALLY rendered to the client.
  renderDigest: varchar('render_digest', { length: 64 }),
  // Framing shown around the item. The text itself is not persisted.
  frameDigest: varchar('frame_digest', { length: 64 }),
  frameTemplateId: varchar('frame_template_id', { length: 100 }),

  // Channel-separation proof.
  llmInvolved: boolean('llm_involved').notNull().default(false),

  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  clientLatencyMs: integer('client_latency_ms'),

  // Segmentation covariates.
  positionInSession: integer('position_in_session'),
  itemsSinceResume: integer('items_since_resume'),
  hoursSincePreviousItem: real('hours_since_previous_item'),
  crossedSectionBoundary: boolean('crossed_section_boundary'),
  isFirstItemAfterPause: boolean('is_first_item_after_pause'),

  // Tamper evidence.
  prevEventHash: varchar('prev_event_hash', { length: 64 }),
  eventHash: varchar('event_hash', { length: 64 }).notNull(),
}, (table) => [
  uniqueIndex('uq_event_assessment_sequence').on(table.assessmentId, table.sequenceIndex),
  index('idx_event_assessment').on(table.assessmentId),
  index('idx_event_session').on(table.sessionId),
  check('chk_event_type', sql`${table.eventType} IN (
    'assessment_opened','session_planned','session_invited','session_opened',
    'frame_presented','section_title_presented','item_presented','item_answered','item_revised',
    'session_paused','session_resumed','session_closed','window_expired',
    'validity_flag_raised','assessment_completed','assessment_invalidated','scored',
    'mid_session_pause','continue_offered','continue_accepted','continue_declined',
    'fatigue_flag_raised','pause_offered','reminder_sent','deadline_warning_sent',
    'session_size_decided'
  )`),
  // An item presentation always proves its fidelity and always proves no model
  // was in the loop at that moment. This is the item-fidelity rule expressed as
  // a database constraint rather than a team convention.
  check('chk_event_item_presentation', sql`(
    ${table.eventType} <> 'item_presented'
    OR (${table.renderDigest} IS NOT NULL AND ${table.itemKey} IS NOT NULL AND ${table.llmInvolved} = false)
  )`),
  // An official section title obeys the same rule as an item.
  check('chk_event_section_title', sql`(
    ${table.eventType} <> 'section_title_presented'
    OR (${table.renderDigest} IS NOT NULL AND ${table.llmInvolved} = false)
  )`),
  check('chk_event_sequence', sql`${table.sequenceIndex} >= 0`),
]);
