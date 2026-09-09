import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { dogs } from './dogs.js';
import { users } from './users.js';

/**
 * Durable Guardian-controlled professional sharing authority.
 *
 * This table stores grants, not reusable bearer links. Recipient identity is
 * deliberately represented separately from display/email metadata so access
 * policy can require a server-verified principal before reading shared data.
 */
export const professionalShareGrants = pgTable('professional_share_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  guardianUserId: uuid('guardian_user_id').notNull().references(() => users.id),
  dogId: uuid('dog_id').notNull().references(() => dogs.id),

  recipientDisplayName: varchar('recipient_display_name', { length: 160 }).notNull(),
  recipientType: varchar('recipient_type', { length: 30 }).notNull(),
  recipientOrganizationName: varchar('recipient_organization_name', { length: 200 }),
  recipientEmail: varchar('recipient_email', { length: 254 }),
  recipientPrincipalId: varchar('recipient_principal_id', { length: 128 }),

  purpose: varchar('purpose', { length: 50 }).notNull(),
  purposeNote: varchar('purpose_note', { length: 500 }),
  scopes: jsonb('scopes').$type<string[]>().notNull(),
  dataFrom: timestamp('data_from', { withTimezone: true }).notNull(),
  dataTo: timestamp('data_to', { withTimezone: true }).notNull(),
  accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }).notNull(),

  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: varchar('revocation_reason', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_prof_share_grant_guardian_dog').on(table.guardianUserId, table.dogId),
  index('idx_prof_share_grant_recipient_principal').on(table.recipientPrincipalId),
  index('idx_prof_share_grant_status_expiry').on(table.status, table.accessExpiresAt),
  check(
    'chk_prof_share_recipient_type',
    sql`${table.recipientType} IN ('VETERINARIAN','VETERINARY_CLINIC','RESEARCHER','OTHER_PROFESSIONAL')`,
  ),
  check(
    'chk_prof_share_purpose',
    sql`${table.purpose} IN ('VETERINARY_CONSULTATION','FOLLOW_UP','SECOND_OPINION','RESEARCH_WITH_SEPARATE_CONSENT','OTHER_DECLARED_PURPOSE')`,
  ),
  check(
    'chk_prof_share_status',
    sql`${table.status} IN ('PENDING','ACTIVE','EXPIRED','REVOKED','SUSPENDED')`,
  ),
  check(
    'chk_prof_share_recipient_binding',
    sql`${table.recipientEmail} IS NOT NULL OR ${table.recipientPrincipalId} IS NOT NULL`,
  ),
  check(
    'chk_prof_share_scopes',
    sql`jsonb_typeof(${table.scopes}) = 'array' AND jsonb_array_length(${table.scopes}) BETWEEN 1 AND 5`,
  ),
  check('chk_prof_share_data_window', sql`${table.dataTo} >= ${table.dataFrom}`),
  check('chk_prof_share_access_window', sql`${table.accessExpiresAt} > ${table.createdAt}`),
  check(
    'chk_prof_share_lifecycle',
    sql`(${table.status} <> 'ACTIVE' OR ${table.activatedAt} IS NOT NULL)
      AND (${table.status} <> 'REVOKED' OR ${table.revokedAt} IS NOT NULL)`,
  ),
]);

/**
 * Sanitized policy-decision audit. Requested grant/dog IDs intentionally have no
 * foreign keys: denied lookups for unknown/substituted identifiers still need a
 * durable audit record, and historical audit must not disappear with lifecycle
 * cleanup of a grant.
 */
export const professionalShareAccessAudits = pgTable('professional_share_access_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  grantId: uuid('grant_id').notNull(),
  dogId: uuid('dog_id').notNull(),
  event: varchar('event', { length: 50 }).notNull(),
  decisionStatus: varchar('decision_status', { length: 20 }).notNull(),
  reason: varchar('reason', { length: 60 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_prof_share_audit_grant_created').on(table.grantId, table.createdAt),
  index('idx_prof_share_audit_dog_created').on(table.dogId, table.createdAt),
  check(
    'chk_prof_share_audit_event',
    sql`${table.event} = 'PROFESSIONAL_SHARE_POLICY_DECISION'`,
  ),
  check(
    'chk_prof_share_audit_status',
    sql`${table.decisionStatus} IN ('DENIED','UNAVAILABLE','AUTHORIZED')`,
  ),
]);
