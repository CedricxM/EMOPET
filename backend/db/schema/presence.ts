import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { dogs } from './dogs.js';
import { users } from './users.js';

/**
 * Durable phone Presence storage foundation for issue #135.
 *
 * This table is persistence only. Product V1 routes remain fail-closed until
 * request idempotency, source identity, retention/export/erasure and temporary
 * proximity authority are separately promoted.
 */
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
  uniqueIndex('uq_phone_presence_events_owner_idempotency').on(
    table.ownerId,
    table.idempotencyKey,
  ),
  index('idx_phone_presence_events_dog_order').on(
    table.dogId,
    table.observedAt,
    table.receivedAt,
    table.eventId,
  ),
  index('idx_phone_presence_events_owner_observed').on(
    table.ownerId,
    table.observedAt,
  ),
  check(
    'chk_phone_presence_events_idempotency_format',
    sql`char_length(${table.idempotencyKey}) BETWEEN 8 AND 128
      AND ${table.idempotencyKey} ~ '^[A-Za-z0-9:_-]+$'`,
  ),
  check(
    'chk_phone_presence_events_source',
    sql`${table.source} IN ('phone_passive', 'manual_override')`,
  ),
]);
