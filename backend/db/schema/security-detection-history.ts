import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { securityAuditEvents } from './security-audit.js';

/**
 * Bounded durable detector output for #805.
 *
 * Actor/target identity stays authoritative in security_audit_events. This
 * table stores only the detector/policy/window/metric tuple plus a deterministic
 * dedupe key. Exact source lineage lives in security_detection_history_events.
 */
export const securityDetectionHistory = pgTable(
  'security_detection_history',
  {
    detectionId: uuid('detection_id').primaryKey().defaultRandom(),
    dedupeKey: varchar('dedupe_key', { length: 64 }).notNull(),
    detectorType: varchar('detector_type', { length: 64 }).notNull(),
    policyRevision: varchar('policy_revision', { length: 64 }).notNull(),
    evaluationWindowStart: timestamp('evaluation_window_start', {
      withTimezone: true,
    }).notNull(),
    evaluationWindowEnd: timestamp('evaluation_window_end', {
      withTimezone: true,
    }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    eventCount: integer('event_count'),
    uniqueTargetCount: integer('unique_target_count'),
  },
  (table) => [
    uniqueIndex('uq_security_detection_history_dedupe_key')
      .on(table.dedupeKey),
    index('idx_security_detection_history_recorded_at')
      .on(table.recordedAt),
    check(
      'chk_security_detection_history_dedupe_key',
      sql`${table.dedupeKey} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'chk_security_detection_history_detector_type',
      sql`${table.detectorType} IN (
        'repeated_privileged_denials',
        'rapid_multi_target_access',
        'machine_privileged_authority_attempt'
      )`,
    ),
    check(
      'chk_security_detection_history_policy_revision',
      sql`${table.policyRevision} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'`,
    ),
    check(
      'chk_security_detection_history_window',
      sql`(
        ${table.evaluationWindowEnd} > ${table.evaluationWindowStart}
        AND ${table.recordedAt} >= ${table.evaluationWindowEnd}
      )`,
    ),
    check(
      'chk_security_detection_history_metric_shape',
      sql`(
        ${table.detectorType} = 'repeated_privileged_denials'
        AND ${table.eventCount} IS NOT NULL
        AND ${table.eventCount} > 0
        AND ${table.uniqueTargetCount} IS NULL
      ) OR (
        ${table.detectorType} = 'rapid_multi_target_access'
        AND ${table.eventCount} IS NULL
        AND ${table.uniqueTargetCount} IS NOT NULL
        AND ${table.uniqueTargetCount} > 0
      ) OR (
        ${table.detectorType} = 'machine_privileged_authority_attempt'
        AND ${table.eventCount} IS NULL
        AND ${table.uniqueTargetCount} IS NULL
      )`,
    ),
  ],
);

export const securityDetectionHistoryEvents = pgTable(
  'security_detection_history_events',
  {
    detectionId: uuid('detection_id')
      .notNull()
      .references(() => securityDetectionHistory.detectionId, {
        onDelete: 'cascade',
      }),
    auditEventId: uuid('audit_event_id')
      .notNull()
      .references(() => securityAuditEvents.id),
  },
  (table) => [
    primaryKey({
      name: 'pk_security_detection_history_events',
      columns: [table.detectionId, table.auditEventId],
    }),
    index('idx_security_detection_history_events_audit_event_id')
      .on(table.auditEventId),
  ],
);
