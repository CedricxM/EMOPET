import { pgTable, uuid, varchar, timestamp, jsonb, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { dogs } from './dogs.js';

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: varchar('category', { length: 30 }).notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id),
  targetCommunityId: uuid('target_community_id'),
  dogId: uuid('dog_id').references(() => dogs.id),
  content: varchar('content', { length: 4000 }).notNull(),
  pushedAt: timestamp('pushed_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, () => [
  // Founder decision AI-A / R4: this table remains discoverable for legacy
  // residue/erasure evidence, but fresh databases must reject new durable rows.
  check('chk_ai_messages_no_durable_persistence', sql`false`),
]);