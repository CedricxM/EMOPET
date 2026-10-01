import { and, asc, eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  users,
  worldOwnedItems,
  worldProgressionEvents,
  worldResourceSpends,
} from '../../db/schema/index.js';
import {
  SAFE_WORLD_REWARDS,
  type WorldProgressionAppendResult,
  type WorldProgressionBalance,
  type WorldProgressionEventKind,
  type WorldProgressionGrant,
  type WorldProgressionLedgerEntry,
  type WorldProgressionLedgerStore,
  type WorldProgressionResource,
} from './world-progression-ledger.js';
import {
  canAffordWorldRegionalItem,
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections.js';

const RESOURCES: readonly WorldProgressionResource[] = [
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_RE = /^[A-Za-z0-9:_-]{8,128}$/;
const REGION_RE = /^(GLOBAL|[A-Z]{2}-[A-Z0-9]{1,3})$/;

type WorldTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class WorldProgressionPersistenceError extends Error {
  constructor(
    readonly code:
      | 'WORLD_PERSISTENCE_CORRUPT_EVENT'
      | 'WORLD_PERSISTENCE_CORRUPT_SPEND'
      | 'WORLD_PERSISTENCE_NEGATIVE_BALANCE'
      | 'WORLD_BUILD_INVALID_OWNER'
      | 'WORLD_BUILD_INVALID_IDEMPOTENCY_KEY'
      | 'WORLD_BUILD_INVALID_REGION'
      | 'WORLD_BUILD_OWNER_NOT_FOUND'
      | 'WORLD_BUILD_IDEMPOTENCY_CONFLICT'
      | 'WORLD_BUILD_CORRUPT_OWNERSHIP',
    message: string,
  ) {
    super(message);
    this.name = 'WorldProgressionPersistenceError';
  }
}

export interface WorldDurableOwnedItem {
  ownerId: string;
  itemId: string;
  regionCode: string;
  builtAt: Date;
}

export interface WorldDurableProgressionState {
  ownerId: string;
  balance: WorldProgressionBalance;
  entries: WorldProgressionLedgerEntry[];
  ownedItems: WorldDurableOwnedItem[];
}

export type WorldDurableBuildResult = {
  decision: 'built' | 'already_owned' | 'unknown_item' | 'insufficient_resources';
  itemId: string;
  balance: WorldProgressionBalance;
  ownedItemIds: string[];
};

function emptyBalance(): WorldProgressionBalance {
  return {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  };
}

function normalizeResourceVector(
  value: unknown,
  corruptionCode: 'WORLD_PERSISTENCE_CORRUPT_EVENT' | 'WORLD_PERSISTENCE_CORRUPT_SPEND',
): WorldProgressionGrant {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorldProgressionPersistenceError(corruptionCode, 'World resource vector must be an object.');
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!RESOURCES.includes(key as WorldProgressionResource)) {
      throw new WorldProgressionPersistenceError(corruptionCode, 'World resource vector contains an unknown resource.');
    }
  }

  const normalized: Partial<Record<WorldProgressionResource, number>> = {};
  for (const resource of RESOURCES) {
    if (!(resource in record)) continue;
    const amount = Number(record[resource]);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new WorldProgressionPersistenceError(corruptionCode, 'World resource amounts must be positive safe integers.');
    }
    normalized[resource] = amount;
  }

  if (Object.keys(normalized).length === 0) {
    throw new WorldProgressionPersistenceError(corruptionCode, 'World resource vector cannot be empty.');
  }

  return normalized;
}

function sameResourceVector(a: WorldProgressionGrant, b: WorldProgressionGrant): boolean {
  return RESOURCES.every((resource) => (a[resource] ?? 0) === (b[resource] ?? 0));
}

function mapEventRow(row: typeof worldProgressionEvents.$inferSelect): WorldProgressionLedgerEntry {
  if (!Object.prototype.hasOwnProperty.call(SAFE_WORLD_REWARDS, row.eventKind)) {
    throw new WorldProgressionPersistenceError(
      'WORLD_PERSISTENCE_CORRUPT_EVENT',
      'Persisted World event kind is outside the server-owned catalogue.',
    );
  }

  const kind = row.eventKind as WorldProgressionEventKind;
  const grants = normalizeResourceVector(row.grantsJson, 'WORLD_PERSISTENCE_CORRUPT_EVENT');
  if (!sameResourceVector(grants, SAFE_WORLD_REWARDS[kind])) {
    throw new WorldProgressionPersistenceError(
      'WORLD_PERSISTENCE_CORRUPT_EVENT',
      'Persisted World grant diverges from the server-owned reward catalogue.',
    );
  }

  return {
    id: row.id,
    ownerId: row.ownerId,
    idempotencyKey: row.idempotencyKey,
    kind,
    sourceRef: row.sourceRef,
    grants,
    recordedAt: row.recordedAt,
  };
}

async function lockOwner(tx: WorldTransaction, ownerId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId}::text, 0))`);
}

async function readBalanceTx(
  tx: WorldTransaction,
  ownerId: string,
): Promise<WorldProgressionBalance> {
  const [eventRows, spendRows] = await Promise.all([
    tx.select({
      eventKind: worldProgressionEvents.eventKind,
      grantsJson: worldProgressionEvents.grantsJson,
    })
      .from(worldProgressionEvents)
      .where(eq(worldProgressionEvents.ownerId, ownerId)),
    tx.select({ costJson: worldResourceSpends.costJson })
      .from(worldResourceSpends)
      .where(eq(worldResourceSpends.ownerId, ownerId)),
  ]);

  const balance = emptyBalance();

  for (const row of eventRows) {
    if (!Object.prototype.hasOwnProperty.call(SAFE_WORLD_REWARDS, row.eventKind)) {
      throw new WorldProgressionPersistenceError(
        'WORLD_PERSISTENCE_CORRUPT_EVENT',
        'Persisted World event kind is outside the server-owned catalogue.',
      );
    }
    const kind = row.eventKind as WorldProgressionEventKind;
    const grant = normalizeResourceVector(row.grantsJson, 'WORLD_PERSISTENCE_CORRUPT_EVENT');
    if (!sameResourceVector(grant, SAFE_WORLD_REWARDS[kind])) {
      throw new WorldProgressionPersistenceError(
        'WORLD_PERSISTENCE_CORRUPT_EVENT',
        'Persisted World grant diverges from the server-owned reward catalogue.',
      );
    }
    for (const resource of RESOURCES) balance[resource] += grant[resource] ?? 0;
  }

  for (const row of spendRows) {
    const cost = normalizeResourceVector(row.costJson, 'WORLD_PERSISTENCE_CORRUPT_SPEND');
    for (const resource of RESOURCES) balance[resource] -= cost[resource] ?? 0;
  }

  if (RESOURCES.some((resource) => balance[resource] < 0)) {
    throw new WorldProgressionPersistenceError(
      'WORLD_PERSISTENCE_NEGATIVE_BALANCE',
      'Persisted World resource state would produce a negative balance.',
    );
  }

  return balance;
}

async function listOwnedItemsTx(
  tx: WorldTransaction,
  ownerId: string,
): Promise<WorldDurableOwnedItem[]> {
  const rows = await tx.select()
    .from(worldOwnedItems)
    .where(eq(worldOwnedItems.ownerId, ownerId))
    .orderBy(asc(worldOwnedItems.builtAt), asc(worldOwnedItems.id));

  return rows.map((row) => ({
    ownerId: row.ownerId,
    itemId: row.itemId,
    regionCode: row.regionCode,
    builtAt: row.builtAt,
  }));
}

export function drizzleWorldProgressionStore(): WorldProgressionLedgerStore {
  return {
    async findByIdempotencyKey(ownerId, idempotencyKey) {
      const [row] = await db.select()
        .from(worldProgressionEvents)
        .where(and(
          eq(worldProgressionEvents.ownerId, ownerId),
          eq(worldProgressionEvents.idempotencyKey, idempotencyKey),
        ))
        .limit(1);
      return row ? mapEventRow(row) : null;
    },

    async appendIfAbsent(entry): Promise<WorldProgressionAppendResult> {
      return db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
        await lockOwner(tx, entry.ownerId);

        const [existingByIdempotency] = await tx.select()
          .from(worldProgressionEvents)
          .where(and(
            eq(worldProgressionEvents.ownerId, entry.ownerId),
            eq(worldProgressionEvents.idempotencyKey, entry.idempotencyKey),
          ))
          .limit(1);
        if (existingByIdempotency) {
          return { inserted: false, entry: mapEventRow(existingByIdempotency) };
        }

        const [existingBySource] = await tx.select()
          .from(worldProgressionEvents)
          .where(and(
            eq(worldProgressionEvents.ownerId, entry.ownerId),
            eq(worldProgressionEvents.eventKind, entry.kind),
            eq(worldProgressionEvents.sourceRef, entry.sourceRef),
          ))
          .limit(1);
        if (existingBySource) {
          return { inserted: false, entry: mapEventRow(existingBySource) };
        }

        const [inserted] = await tx.insert(worldProgressionEvents)
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
          throw new Error('World progression insert returned no row.');
        }

        return { inserted: true, entry: mapEventRow(inserted) };
      });
    },

    async getBalance(ownerId) {
      return db.transaction(async (tx) => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
        await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
        return readBalanceTx(tx, ownerId);
      });
    },
  };
}

export async function readWorldDurableProgressionState(
  ownerId: string,
): Promise<WorldDurableProgressionState> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

    const rows = await tx.select()
      .from(worldProgressionEvents)
      .where(eq(worldProgressionEvents.ownerId, ownerId))
      .orderBy(asc(worldProgressionEvents.recordedAt), asc(worldProgressionEvents.id));

    return {
      ownerId,
      balance: await readBalanceTx(tx, ownerId),
      entries: rows.map(mapEventRow),
      ownedItems: await listOwnedItemsTx(tx, ownerId),
    };
  });
}

export async function buildWorldItemDurably(input: {
  ownerId: string;
  idempotencyKey: string;
  regionCode: string;
  itemId: string;
  catalog: WorldRegionalCollectionCatalog;
}): Promise<WorldDurableBuildResult> {
  if (!UUID_RE.test(input.ownerId)) {
    throw new WorldProgressionPersistenceError('WORLD_BUILD_INVALID_OWNER', 'Owner id is invalid.');
  }
  if (!IDEMPOTENCY_RE.test(input.idempotencyKey)) {
    throw new WorldProgressionPersistenceError(
      'WORLD_BUILD_INVALID_IDEMPOTENCY_KEY',
      'Build idempotency key is invalid.',
    );
  }
  if (!REGION_RE.test(input.regionCode)) {
    throw new WorldProgressionPersistenceError('WORLD_BUILD_INVALID_REGION', 'Region code is invalid.');
  }

  const collection = resolveWorldRegionalCollection(input.catalog, input.regionCode);
  const item = collection.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    const state = await readWorldDurableProgressionState(input.ownerId);
    return {
      decision: 'unknown_item',
      itemId: itemId,
      balance: state.balance,
      ownedItemIds: state.ownedItems.map((row) => row.itemId),
    };
  }

  const canonicalCost = normalizeResourceVector(item.cost, 'WORLD_PERSISTENCE_CORRUPT_SPEND');

  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    await lockOwner(tx, input.ownerId);

    const [owner] = await tx.select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.ownerId))
      .limit(1);
    if (!owner) {
      throw new WorldProgressionPersistenceError(
        'WORLD_BUILD_OWNER_NOT_FOUND',
        'World build Owner does not exist.',
      );
    }

    const [existingSpend] = await tx.select()
      .from(worldResourceSpends)
      .where(and(
        eq(worldResourceSpends.ownerId, input.ownerId),
        eq(worldResourceSpends.idempotencyKey, input.idempotencyKey),
      ))
      .limit(1);

    if (existingSpend) {
      const persistedCost = normalizeResourceVector(
        existingSpend.costJson,
        'WORLD_PERSISTENCE_CORRUPT_SPEND',
      );
      if (existingSpend.itemId !== item.id || !sameResourceVector(persistedCost, canonicalCost)) {
        throw new WorldProgressionPersistenceError(
          'WORLD_BUILD_IDEMPOTENCY_CONFLICT',
          'Build idempotency key is already bound to a different build.',
        );
      }

      const [owned] = await tx.select({ id: worldOwnedItems.id })
        .from(worldOwnedItems)
        .where(and(
          eq(worldOwnedItems.ownerId, input.ownerId),
          eq(worldOwnedItems.itemId, item.id),
        ))
        .limit(1);
      if (!owned) {
        throw new WorldProgressionPersistenceError(
          'WORLD_BUILD_CORRUPT_OWNERSHIP',
          'Persisted build spend is missing its owned item.',
        );
      }

      return {
        decision: 'already_owned',
        itemId: item.id,
        balance: await readBalanceTx(tx, input.ownerId),
        ownedItemIds: (await listOwnedItemsTx(tx, input.ownerId)).map((row) => row.itemId),
      };
    }

    const existingOwned = await listOwnedItemsTx(tx, input.ownerId);
    if (existingOwned.some((row) => row.itemId === item.id)) {
      return {
        decision: 'already_owned',
        itemId: item.id,
        balance: await readBalanceTx(tx, input.ownerId),
        ownedItemIds: existingOwned.map((row) => row.itemId),
      };
    }

    const balance = await readBalanceTx(tx, input.ownerId);
    if (!canAffordWorldRegionalItem(balance, item)) {
      return {
        decision: 'insufficient_resources',
        itemId: item.id,
        balance,
        ownedItemIds: existingOwned.map((row) => row.itemId),
      };
    }

    await tx.insert(worldResourceSpends).values({
      ownerId: input.ownerId,
      idempotencyKey: input.idempotencyKey,
      itemId: item.id,
      costJson: canonicalCost,
      recordedAt: new Date(),
    });

    await tx.insert(worldOwnedItems).values({
      ownerId: input.ownerId,
      itemId: item.id,
      regionCode: collection.regionCode,
      builtAt: new Date(),
    });

    return {
      decision: 'built',
      itemId: item.id,
      balance: await readBalanceTx(tx, input.ownerId),
      ownedItemIds: (await listOwnedItemsTx(tx, input.ownerId)).map((row) => row.itemId),
    };
  });
}
