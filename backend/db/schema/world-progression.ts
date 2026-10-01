import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Durable World progression economy.
 *
 * These relations are canonical SQL storage only. Their presence does not
 * activate gamification HTTP routes or production write authority.
 *
 * Account-erasure/export/retention dispositions remain TO_CONFIRM, therefore
 * Owner foreign keys intentionally keep PostgreSQL NO ACTION.
 */
export const worldProgressionEvents = pgTable('world_progression_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  eventKind: varchar('event_kind', { length: 100 }).notNull(),
  sourceRef: varchar('source_ref', { length: 160 }).notNull(),
  grantsJson: jsonb('grants_json').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_world_progression_events_owner_idempotency')
    .on(table.ownerId, table.idempotencyKey),
  unique('uq_world_progression_events_owner_source')
    .on(table.ownerId, table.eventKind, table.sourceRef),
  index('idx_world_progression_events_owner_recorded')
    .on(table.ownerId, table.recordedAt),
  check(
    'chk_world_progression_events_idempotency_key',
    sql`${table.idempotencyKey} ~ '^[A-Za-z0-9:_-]{8,128}$'`,
  ),
  check(
    'chk_world_progression_events_source_ref',
    sql`${table.sourceRef} ~ '^[A-Za-z0-9:._/-]{1,160}$'`,
  ),
  check(
    'chk_world_progression_events_reward_authority',
    sql`(
      (${table.eventKind} = 'knowledge.card_read'
        AND ${table.grantsJson} = '{"knowledgeFragments":1}'::jsonb)
      OR
      (${table.eventKind} = 'local.place_saved'
        AND ${table.grantsJson} = '{"localDiscoveries":2}'::jsonb)
      OR
      (${table.eventKind} = 'local.route_saved'
        AND ${table.grantsJson} = '{"walkTraces":2,"localDiscoveries":1}'::jsonb)
      OR
      (${table.eventKind} = 'community.contribution_created'
        AND ${table.grantsJson} = '{"communitySeeds":2}'::jsonb)
      OR
      (${table.eventKind} = 'world.group_joined'
        AND ${table.grantsJson} = '{"communitySeeds":1}'::jsonb)
      OR
      (${table.eventKind} = 'memory.created'
        AND ${table.grantsJson} = '{"memoryThreads":2}'::jsonb)
    )`,
  ),
]);

export const worldOwnedItems = pgTable('world_owned_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  itemId: varchar('item_id', { length: 160 }).notNull(),
  regionCode: varchar('region_code', { length: 16 }).notNull(),
  builtAt: timestamp('built_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_world_owned_items_owner_item').on(table.ownerId, table.itemId),
  index('idx_world_owned_items_owner_built').on(table.ownerId, table.builtAt),
  check(
    'chk_world_owned_items_item_id',
    sql`${table.itemId} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'`,
  ),
  check(
    'chk_world_owned_items_region_code',
    sql`${table.regionCode} = 'GLOBAL'
      OR ${table.regionCode} ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'`,
  ),
]);

export const worldResourceSpends = pgTable('world_resource_spends', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  itemId: varchar('item_id', { length: 160 }).notNull(),
  costJson: jsonb('cost_json').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('uq_world_resource_spends_owner_idempotency')
    .on(table.ownerId, table.idempotencyKey),
  index('idx_world_resource_spends_owner_recorded')
    .on(table.ownerId, table.recordedAt),
  check(
    'chk_world_resource_spends_idempotency_key',
    sql`${table.idempotencyKey} ~ '^[A-Za-z0-9:_-]{8,128}$'`,
  ),
  check(
    'chk_world_resource_spends_item_id',
    sql`${table.itemId} ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$'`,
  ),
  check(
    'chk_world_resource_spends_cost_shape',
    sql`jsonb_typeof(${table.costJson}) = 'object'
      AND ${table.costJson} <> '{}'::jsonb
      AND ${table.costJson}
        - 'knowledgeFragments'
        - 'localDiscoveries'
        - 'walkTraces'
        - 'communitySeeds'
        - 'memoryThreads' = '{}'::jsonb
      AND (
        ${table.costJson}->>'knowledgeFragments' IS NULL
        OR ${table.costJson}->>'knowledgeFragments' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        ${table.costJson}->>'localDiscoveries' IS NULL
        OR ${table.costJson}->>'localDiscoveries' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        ${table.costJson}->>'walkTraces' IS NULL
        OR ${table.costJson}->>'walkTraces' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        ${table.costJson}->>'communitySeeds' IS NULL
        OR ${table.costJson}->>'communitySeeds' ~ '^[1-9][0-9]{0,5}$'
      )
      AND (
        ${table.costJson}->>'memoryThreads' IS NULL
        OR ${table.costJson}->>'memoryThreads' ~ '^[1-9][0-9]{0,5}$'
      )`,
  ),
]);
