import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const worldProgressionEvents = pgTable(
  'world_progression_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    eventKind: varchar('event_kind', { length: 64 }).notNull(),
    sourceRef: varchar('source_ref', { length: 160 }).notNull(),
    grantsJson: jsonb('grants_json').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'fk_world_progression_events_owner',
      columns: [table.ownerId],
      foreignColumns: [users.id],
    }),
    uniqueIndex('uq_world_progression_events_owner_idempotency')
      .on(table.ownerId, table.idempotencyKey),
    uniqueIndex('uq_world_progression_events_owner_source')
      .on(table.ownerId, table.eventKind, table.sourceRef),
    index('idx_world_progression_events_owner_recorded')
      .on(table.ownerId, table.recordedAt),
    check(
      'chk_world_progression_events_idempotency',
      sql`${table.idempotencyKey} ~ '^[A-Za-z0-9:_-]{8,128}$'`,
    ),
    check(
      'chk_world_progression_events_source_ref',
      sql`${table.sourceRef} ~ '^[A-Za-z0-9:._/-]{1,160}$'`,
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
      'chk_world_progression_events_grants_shape',
      sql`jsonb_typeof(${table.grantsJson}) = 'object'
        AND ${table.grantsJson} <> '{}'::jsonb
        AND (${table.grantsJson} - ARRAY[
          'knowledgeFragments',
          'localDiscoveries',
          'walkTraces',
          'communitySeeds',
          'memoryThreads'
        ]::text[]) = '{}'::jsonb`,
    ),
  ],
);

export const worldOwnedItems = pgTable(
  'world_owned_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    itemId: varchar('item_id', { length: 160 }).notNull(),
    regionCode: varchar('region_code', { length: 16 }).notNull(),
    builtAt: timestamp('built_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'fk_world_owned_items_owner',
      columns: [table.ownerId],
      foreignColumns: [users.id],
    }),
    uniqueIndex('uq_world_owned_items_owner_item').on(table.ownerId, table.itemId),
    index('idx_world_owned_items_owner_built').on(table.ownerId, table.builtAt),
    check(
      'chk_world_owned_items_item_id',
      sql`${table.itemId} ~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$'`,
    ),
    check(
      'chk_world_owned_items_region',
      sql`${table.regionCode} = 'GLOBAL' OR ${table.regionCode} ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$'`,
    ),
  ],
);

export const worldResourceSpends = pgTable(
  'world_resource_spends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    itemId: varchar('item_id', { length: 160 }).notNull(),
    costJson: jsonb('cost_json').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: 'fk_world_resource_spends_owner',
      columns: [table.ownerId],
      foreignColumns: [users.id],
    }),
    uniqueIndex('uq_world_resource_spends_owner_idempotency')
      .on(table.ownerId, table.idempotencyKey),
    index('idx_world_resource_spends_owner_recorded')
      .on(table.ownerId, table.recordedAt),
    check(
      'chk_world_resource_spends_idempotency',
      sql`${table.idempotencyKey} ~ '^[A-Za-z0-9:_-]{8,128}$'`,
    ),
    check(
      'chk_world_resource_spends_item_id',
      sql`${table.itemId} ~ '^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$'`,
    ),
    check(
      'chk_world_resource_spends_cost_shape',
      sql`jsonb_typeof(${table.costJson}) = 'object'
        AND ${table.costJson} <> '{}'::jsonb
        AND (${table.costJson} - ARRAY[
          'knowledgeFragments',
          'localDiscoveries',
          'walkTraces',
          'communitySeeds',
          'memoryThreads'
        ]::text[]) = '{}'::jsonb`,
    ),
  ],
);
