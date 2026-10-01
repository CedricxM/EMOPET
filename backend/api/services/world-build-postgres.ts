import { and, eq, sql } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import {
  worldOwnedItems,
  worldProgressionEvents,
  worldResourceSpends,
} from '../../db/schema/index.js';
import {
  planWorldBuild,
  type WorldBuildDecision,
} from './world-build-economy.js';
import type {
  WorldRegionalCollection,
} from './world-regional-collections.js';
import type {
  WorldProgressionBalance,
} from './world-progression-ledger.js';
import {
  applyPersistedWorldResourceMap,
  emptyWorldProgressionBalance,
} from './world-progression-postgres.js';
import { isCanonicalSubjectUuid } from './subject-access.js';

const IDEMPOTENCY_RE = /^[A-Za-z0-9:_-]{8,128}$/;

export type WorldDurableBuildDecision =
  | WorldBuildDecision
  | 'duplicate';

export interface WorldDurableBuildResult {
  decision: WorldDurableBuildDecision;
  itemId: string;
  balance: WorldProgressionBalance;
  ownedItemIds: string[];
}

export class WorldBuildPersistenceError extends Error {
  constructor(
    readonly code:
      | 'WORLD_BUILD_INVALID_OWNER'
      | 'WORLD_BUILD_INVALID_IDEMPOTENCY_KEY'
      | 'WORLD_BUILD_IDEMPOTENCY_CONFLICT'
      | 'WORLD_BUILD_PERSISTENCE_INVARIANT',
    message: string,
  ) {
    super(message);
    this.name = 'WorldBuildPersistenceError';
  }
}

function validateBuildInput(ownerId: string, idempotencyKey: string): void {
  if (!isCanonicalSubjectUuid(ownerId)) {
    throw new WorldBuildPersistenceError(
      'WORLD_BUILD_INVALID_OWNER',
      'World build owner must be a canonical UUID.',
    );
  }
  if (!IDEMPOTENCY_RE.test(idempotencyKey)) {
    throw new WorldBuildPersistenceError(
      'WORLD_BUILD_INVALID_IDEMPOTENCY_KEY',
      'World build idempotency key must be 8-128 bounded token characters.',
    );
  }
}

export class PostgresWorldBuildService {
  constructor(private readonly database: Database = db) {}

  async build(input: {
    ownerId: string;
    idempotencyKey: string;
    collection: WorldRegionalCollection;
    itemId: string;
  }): Promise<WorldDurableBuildResult> {
    validateBuildInput(input.ownerId, input.idempotencyKey);

    return this.database.transaction(async (tx) => {
      // READ COMMITTED + a transaction-scoped per-Owner advisory lock gives
      // conflict-safe serialization without stale SERIALIZABLE snapshots.
      // A waiting build acquires the lock only after the prior build commits,
      // then subsequent statements observe that committed spend/ownership.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.ownerId}::text, 1))`,
      );

      const [existingSpend] = await tx
        .select()
        .from(worldResourceSpends)
        .where(and(
          eq(worldResourceSpends.ownerId, input.ownerId),
          eq(worldResourceSpends.idempotencyKey, input.idempotencyKey),
        ))
        .limit(1);

      if (existingSpend) {
        if (existingSpend.itemId !== input.itemId) {
          throw new WorldBuildPersistenceError(
            'WORLD_BUILD_IDEMPOTENCY_CONFLICT',
            'The build idempotency key is already bound to a different World build.',
          );
        }
        const state = await this.readState(tx, input.ownerId);
        if (!state.ownedItemIds.includes(existingSpend.itemId)) {
          throw new WorldBuildPersistenceError(
            'WORLD_BUILD_PERSISTENCE_INVARIANT',
            'Committed World build spend is missing its ownership row.',
          );
        }
        return {
          decision: 'duplicate',
          itemId: existingSpend.itemId,
          balance: state.balance,
          ownedItemIds: state.ownedItemIds,
        };
      }

      const item = input.collection.items.find((candidate) => candidate.id === input.itemId);
      const state = await this.readState(tx, input.ownerId);
      const plan = planWorldBuild({
        ownerId: input.ownerId,
        ownerBalance: { ownerId: input.ownerId, balance: state.balance },
        ownedItems: state.ownedItemIds.map((itemId) => ({
          ownerId: input.ownerId,
          itemId,
        })),
        collection: input.collection,
        itemId: input.itemId,
      });

      if (plan.decision !== 'built') {
        return plan;
      }
      if (!item) {
        throw new WorldBuildPersistenceError(
          'WORLD_BUILD_PERSISTENCE_INVARIANT',
          'Built projection must resolve a server-owned catalogue item.',
        );
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
        balance: plan.balance,
        ownedItemIds: plan.ownedItemIds,
      };
    });
  }

  private async readState(
    tx: any,
    ownerId: string,
  ): Promise<{ balance: WorldProgressionBalance; ownedItemIds: string[] }> {
    const [eventRows, spendRows, ownedRows] = await Promise.all([
      tx
        .select({ grantsJson: worldProgressionEvents.grantsJson })
        .from(worldProgressionEvents)
        .where(eq(worldProgressionEvents.ownerId, ownerId)),
      tx
        .select({ costJson: worldResourceSpends.costJson })
        .from(worldResourceSpends)
        .where(eq(worldResourceSpends.ownerId, ownerId)),
      tx
        .select({ itemId: worldOwnedItems.itemId })
        .from(worldOwnedItems)
        .where(eq(worldOwnedItems.ownerId, ownerId)),
    ]);

    const balance = emptyWorldProgressionBalance();
    for (const row of eventRows) {
      applyPersistedWorldResourceMap(balance, row.grantsJson, 1, 'grant');
    }
    for (const row of spendRows) {
      applyPersistedWorldResourceMap(balance, row.costJson, -1, 'cost');
    }

    const ownedItemIds = ownedRows.map((row: { itemId: string }) => row.itemId);
    if (new Set(ownedItemIds).size !== ownedItemIds.length) {
      throw new WorldBuildPersistenceError(
        'WORLD_BUILD_PERSISTENCE_INVARIANT',
        'Durable World ownership contains duplicate rows.',
      );
    }

    return { balance, ownedItemIds };
  }
}

export const postgresWorldBuildService = new PostgresWorldBuildService();
