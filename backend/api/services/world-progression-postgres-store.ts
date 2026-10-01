import { and, eq, sql } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import {
  worldOwnedItems,
  worldProgressionEvents,
  worldResourceSpends,
} from '../../db/schema/index.js';
import {
  canAffordWorldRegionalItem,
  type WorldRegionalCollection,
} from './world-regional-collections.js';
import type {
  WorldProgressionAppendResult,
  WorldProgressionBalance,
  WorldProgressionEventKind,
  WorldProgressionGrant,
  WorldProgressionLedgerEntry,
  WorldProgressionLedgerStore,
  WorldProgressionResource,
} from './world-progression-ledger.js';

const RESOURCES: readonly WorldProgressionResource[] = [
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
] as const;

export type WorldDurableBuildDecision =
  | 'built'
  | 'already_owned'
  | 'unknown_item'
  | 'insufficient_resources';

export interface WorldDurableBuildResult {
  decision: WorldDurableBuildDecision;
  itemId: string;
  replayed: boolean;
  balance: WorldProgressionBalance;
  ownedItemIds: string[];
}

/**
 * Durable PostgreSQL implementation for the G1 World economy.
 *
 * This module is intentionally not imported by any HTTP route. Durable schema
 * availability is not equivalent to runtime production authority.
 */
export class PostgresWorldProgressionStore implements WorldProgressionLedgerStore {
  constructor(private readonly database: Database = db) {}

  async findByIdempotencyKey(
    ownerId: string,
    idempotencyKey: string,
  ): Promise<WorldProgressionLedgerEntry | null> {
    const [row] = await this.database
      .select()
      .from(worldProgressionEvents)
      .where(and(
        eq(worldProgressionEvents.ownerId, ownerId),
        eq(worldProgressionEvents.idempotencyKey, idempotencyKey),
      ))
      .limit(1);

    return row ? eventRowToEntry(row) : null;
  }

  async appendIfAbsent(
    entry: WorldProgressionLedgerEntry,
  ): Promise<WorldProgressionAppendResult> {
    return this.database.transaction(async (tx) => {
      await lockOwner(tx, entry.ownerId, 0);

      const [idempotentReplay] = await tx
        .select()
        .from(worldProgressionEvents)
        .where(and(
          eq(worldProgressionEvents.ownerId, entry.ownerId),
          eq(worldProgressionEvents.idempotencyKey, entry.idempotencyKey),
        ))
        .limit(1);

      if (idempotentReplay) {
        return { inserted: false, entry: eventRowToEntry(idempotentReplay) };
      }

      const [sourceReplay] = await tx
        .select()
        .from(worldProgressionEvents)
        .where(and(
          eq(worldProgressionEvents.ownerId, entry.ownerId),
          eq(worldProgressionEvents.eventKind, entry.kind),
          eq(worldProgressionEvents.sourceRef, entry.sourceRef),
        ))
        .limit(1);

      if (sourceReplay) {
        return { inserted: false, entry: eventRowToEntry(sourceReplay) };
      }

      const [inserted] = await tx
        .insert(worldProgressionEvents)
        .values({
          id: entry.id,
          ownerId: entry.ownerId,
          idempotencyKey: entry.idempotencyKey,
          eventKind: entry.kind,
          sourceRef: entry.sourceRef,
          grantsJson: entry.grants,
          recordedAt: entry.recordedAt,
        })
        .returning();

      if (!inserted) {
        throw new Error('WORLD_PROGRESSION_EVENT_INSERT_FAILED');
      }

      return { inserted: true, entry: eventRowToEntry(inserted) };
    });
  }

  async getBalance(ownerId: string): Promise<WorldProgressionBalance> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      return readOwnerBalance(tx, ownerId);
    });
  }

  async buildItem(input: {
    ownerId: string;
    idempotencyKey: string;
    collection: WorldRegionalCollection;
    itemId: string;
  }): Promise<WorldDurableBuildResult> {
    const item = input.collection.items.find((candidate) => candidate.id === input.itemId);
    if (!item) {
      return {
        decision: 'unknown_item',
        itemId: input.itemId,
        replayed: false,
        balance: await this.getBalance(input.ownerId),
        ownedItemIds: await this.listOwnedItemIds(input.ownerId),
      };
    }

    return this.database.transaction(async (tx) => {
      await lockOwner(tx, input.ownerId, 1);

      const [existingSpend] = await tx
        .select()
        .from(worldResourceSpends)
        .where(and(
          eq(worldResourceSpends.ownerId, input.ownerId),
          eq(worldResourceSpends.idempotencyKey, input.idempotencyKey),
        ))
        .limit(1);

      if (existingSpend) {
        if (
          existingSpend.itemId !== item.id
          || !sameResourceAmounts(
            existingSpend.costJson as WorldProgressionGrant,
            item.cost,
          )
        ) {
          throw new Error('WORLD_BUILD_IDEMPOTENCY_CONFLICT');
        }

        const [owned] = await tx
          .select({ id: worldOwnedItems.id })
          .from(worldOwnedItems)
          .where(and(
            eq(worldOwnedItems.ownerId, input.ownerId),
            eq(worldOwnedItems.itemId, item.id),
          ))
          .limit(1);

        if (!owned) {
          throw new Error('WORLD_BUILD_PERSISTENCE_CORRUPTION');
        }

        return {
          decision: 'already_owned',
          itemId: item.id,
          replayed: true,
          balance: await readOwnerBalance(tx, input.ownerId),
          ownedItemIds: await listOwnedItemIdsInTransaction(tx, input.ownerId),
        };
      }

      const [alreadyOwned] = await tx
        .select({ id: worldOwnedItems.id })
        .from(worldOwnedItems)
        .where(and(
          eq(worldOwnedItems.ownerId, input.ownerId),
          eq(worldOwnedItems.itemId, item.id),
        ))
        .limit(1);

      if (alreadyOwned) {
        return {
          decision: 'already_owned',
          itemId: item.id,
          replayed: false,
          balance: await readOwnerBalance(tx, input.ownerId),
          ownedItemIds: await listOwnedItemIdsInTransaction(tx, input.ownerId),
        };
      }

      const balance = await readOwnerBalance(tx, input.ownerId);
      if (!canAffordWorldRegionalItem(balance, item)) {
        return {
          decision: 'insufficient_resources',
          itemId: item.id,
          replayed: false,
          balance,
          ownedItemIds: await listOwnedItemIdsInTransaction(tx, input.ownerId),
        };
      }

      await tx.insert(worldResourceSpends).values({
        ownerId: input.ownerId,
        idempotencyKey: input.idempotencyKey,
        itemId: item.id,
        costJson: item.cost,
      });

      await tx.insert(worldOwnedItems).values({
        ownerId: input.ownerId,
        itemId: item.id,
        regionCode: input.collection.regionCode,
      });

      return {
        decision: 'built',
        itemId: item.id,
        replayed: false,
        balance: await readOwnerBalance(tx, input.ownerId),
        ownedItemIds: await listOwnedItemIdsInTransaction(tx, input.ownerId),
      };
    });
  }

  async listOwnedItemIds(ownerId: string): Promise<string[]> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      return listOwnedItemIdsInTransaction(tx, ownerId);
    });
  }
}

async function lockOwner(
  tx: any,
  ownerId: string,
  namespace: number,
): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}::text, ${namespace}))`,
  );
}

async function readOwnerBalance(
  tx: any,
  ownerId: string,
): Promise<WorldProgressionBalance> {
  const [events, spends] = await Promise.all([
    tx
      .select({ grantsJson: worldProgressionEvents.grantsJson })
      .from(worldProgressionEvents)
      .where(eq(worldProgressionEvents.ownerId, ownerId)),
    tx
      .select({ costJson: worldResourceSpends.costJson })
      .from(worldResourceSpends)
      .where(eq(worldResourceSpends.ownerId, ownerId)),
  ]);

  const balance = emptyBalance();
  for (const row of events) addAmounts(balance, row.grantsJson as WorldProgressionGrant, 1);
  for (const row of spends) addAmounts(balance, row.costJson as WorldProgressionGrant, -1);

  if (RESOURCES.some((resource) => balance[resource] < 0)) {
    throw new Error('WORLD_PROGRESSION_NEGATIVE_BALANCE_CORRUPTION');
  }

  return balance;
}

async function listOwnedItemIdsInTransaction(
  tx: any,
  ownerId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ itemId: worldOwnedItems.itemId })
    .from(worldOwnedItems)
    .where(eq(worldOwnedItems.ownerId, ownerId));

  const ids = rows.map((row: { itemId: string }) => row.itemId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('WORLD_BUILD_DUPLICATE_OWNERSHIP_CORRUPTION');
  }
  return ids.sort();
}

function eventRowToEntry(row: typeof worldProgressionEvents.$inferSelect): WorldProgressionLedgerEntry {
  return {
    id: row.id,
    ownerId: row.ownerId,
    idempotencyKey: row.idempotencyKey,
    kind: row.eventKind as WorldProgressionEventKind,
    sourceRef: row.sourceRef,
    grants: row.grantsJson as WorldProgressionGrant,
    recordedAt: row.recordedAt,
  };
}

function sameResourceAmounts(
  left: WorldProgressionGrant,
  right: WorldProgressionGrant,
): boolean {
  return RESOURCES.every(
    (resource) => Number(left[resource] ?? 0) === Number(right[resource] ?? 0),
  );
}

function emptyBalance(): WorldProgressionBalance {
  return {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  };
}

function addAmounts(
  balance: WorldProgressionBalance,
  amounts: WorldProgressionGrant,
  sign: 1 | -1,
): void {
  for (const resource of RESOURCES) {
    balance[resource] += sign * Number(amounts[resource] ?? 0);
  }
}
