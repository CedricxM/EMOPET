import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Durable Product V1 Contact candidate.
 *
 * The authenticated core-user UUID is the only requester authority. This table
 * deliberately does not persist the legacy caller-controlled owner token or a
 * duplicated phone/email contact value. Operational staff access, retention,
 * erasure/export and production enablement remain separate CONTACT-AUTH-01
 * gates.
 */
export const contactRequests = pgTable('contact_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterUserId: uuid('requester_user_id').notNull().references(() => users.id),
  reason: varchar('reason', { length: 40 }).notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_contact_requests_requester_created').on(
    table.requesterUserId,
    table.createdAt.desc().nullsFirst(),
    table.id.desc().nullsFirst(),
  ),
]);
