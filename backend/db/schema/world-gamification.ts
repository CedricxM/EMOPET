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
 * Durable storage for governed World progression.
 *
 * These relations are deliberately Owner-linked with NO ACTION foreign keys.
 * Privacy/export/retention disposition remains TO_CONFIRM, so database schema
 * existence does not promote the G1/G2 contracts to production authority.
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
  unique('uq_world_progression_events_owner_kind_source')
    .on(table.ownerId, table.eventKind, table.sourceRef),
  index('idx_world_progression_events_owner_recorded')
    .on(table.ownerId, table.recordedAt),
  check(
    'chk_world_progression_events_idempotency_nonempty',
    sql`length(${table.idempotencyKey}) >= 8`,
  ),
  check(
    'chk_world_progression_events_source_nonempty',
    sql`length(${table.sourceRef}) >= 1`,
  ),
  check(
    'chk_world_progression_events_kind',
    sql`${table.eventKind} IN (
      'knowledge.card_read',
      'local.place_saved',
      'local.route_saved',
      'community.contribution_created',
      'world.group_joined',
      'memory.created'
    )`,
  ),
  check(
    'chk_world_progression_events_grants_object',
    sql`jsonb_typeof(${table.grantsJson}) = 'object' AND ${table.grantsJson} <> '{}'::jsonb`,
  ),
  check(
    'chk_world_progression_events_grants_exact',
    sql`(
      (${table.eventKind} = 'knowledge.card_read'
        AND ${table.grantsJson} = '{"knowledgeFragments": 1}'::jsonb)
      OR (${table.eventKind} = 'local.place_saved'
        AND ${table.grantsJson} = '{"localDiscoveries": 2}'::jsonb)
      OR (${table.eventKind} = 'local.route_saved'
        AND ${table.grantsJson} = '{"walkTraces": 2, "localDiscoveries": 1}'::jsonb)
      OR (${table.eventKind} = 'community.contribution_created'
        AND ${table.grantsJson} = '{"communitySeeds": 2}'::jsonb)
      OR (${table.eventKind} = 'world.group_joined'
        AND ${table.grantsJson} = '{"communitySeeds": 1}'::jsonb)
      OR (${table.eventKind} = 'memory.created'
        AND ${table.grantsJson} = '{"memoryThreads": 2}'::jsonb)
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
  check('chk_world_owned_items_item_nonempty', sql`length(${table.itemId}) >= 1`),
  check(
    'chk_world_owned_items_region_code',
    sql`${table.regionCode} = 'GLOBAL' OR ${table.regionCode} ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'`,
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
    'chk_world_resource_spends_idempotency_nonempty',
    sql`length(${table.idempotencyKey}) >= 8`,
  ),
  check('chk_world_resource_spends_item_nonempty', sql`length(${table.itemId}) >= 1`),
  check(
    'chk_world_resource_spends_cost_object',
    sql`jsonb_typeof(${table.costJson}) = 'object' AND ${table.costJson} <> '{}'::jsonb`,
  ),
  check(
    'chk_world_resource_spends_cost_keys',
    sql`${table.costJson} - ARRAY[
      'knowledgeFragments',
      'localDiscoveries',
      'walkTraces',
      'communitySeeds',
      'memoryThreads'
    ] = '{}'::jsonb`,
  ),
  check(
    'chk_world_resource_spends_cost_positive_integers',
    sql`(
      (NOT (${table.costJson} ? 'knowledgeFragments')
        OR (
          jsonb_typeof(${table.costJson} -> 'knowledgeFragments') = 'number'
          AND (${table.costJson} ->> 'knowledgeFragments') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (${table.costJson} ? 'localDiscoveries')
        OR (
          jsonb_typeof(${table.costJson} -> 'localDiscoveries') = 'number'
          AND (${table.costJson} ->> 'localDiscoveries') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (${table.costJson} ? 'walkTraces')
        OR (
          jsonb_typeof(${table.costJson} -> 'walkTraces') = 'number'
          AND (${table.costJson} ->> 'walkTraces') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (${table.costJson} ? 'communitySeeds')
        OR (
          jsonb_typeof(${table.costJson} -> 'communitySeeds') = 'number'
          AND (${table.costJson} ->> 'communitySeeds') ~ '^[1-9][0-9]*$'
        ))
      AND (NOT (${table.costJson} ? 'memoryThreads')
        OR (
          jsonb_typeof(${table.costJson} -> 'memoryThreads') = 'number'
          AND (${table.costJson} ->> 'memoryThreads') ~ '^[1-9][0-9]*$'
        ))
    )`,
  )
]);
