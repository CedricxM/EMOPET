import { and, eq, sql } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import {
  worldProgressionEvents,
  worldResourceSpends,
} from '../../db/schema/index.js';
import type {
  WorldProgressionAppendResult,
  WorldProgressionBalance,
  WorldProgressionEventKind,
  WorldProgressionGrant,
  WorldProgressionLedgerEntry,
  WorldProgressionLedgerStore,
  WorldProgressionResource,
} from './world-progression-ledger.js';

const WORLD_RESOURCES: readonly WorldProgressionResource[] = [
  'knowledgeFragments',
  'localDiscoveries',
  'walkTraces',
  'communitySeeds',
  'memoryThreads',
] as const;

function emptyBalance(): WorldProgressionBalance {
  return {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  };
}

function rowToEntry(row: typeof worldProgressionEvents.$inferSelect): WorldProgressionLedgerEntry {
  return {
    id: row.id,
    ownerId: row.ownerId,
    idempotencyKey: row.idempotencyKey,
    kind: row.eventKind as WorldProgressionEventKind,
    sourceRef: row.sourceRef,
    grants: validatePersistedResourceMap(row.grantsJson, 'grant'),
    recordedAt: row.recordedAt,
  };
}

function validatePersistedResourceMap(
  value: unknown,
  label: 'grant' | 'cost',
): WorldProgressionGrant {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`WORLD_PROGRESSION_PERSISTED_${label.toUpperCase()}_INVALID`);
  }

  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (!WORLD_RESOURCES.includes(key as WorldProgressionResource)) {
      throw new Error(`WORLD_PROGRESSION_PERSISTED_${label.toUpperCase()}_INVALID`);
    }
  }

  const clean: Partial<Record<WorldProgressionResource, number>> = {};
  for (const resource of WORLD_RESOURCES) {
    if (!(resource in raw)) continue;
    const amount = raw[resource];
    if (!Number.isInteger(amount) || Number(amount) <= 0) {
      throw new Error(`WORLD_PROGRESSION_PERSISTED_${label.toUpperCase()}_INVALID`);
    }
    clean[resource] = Number(amount);
  }

  if (Object.keys(clean).length === 0) {
    throw new Error(`WORLD_PROGRESSION_PERSISTED_${label.toUpperCase()}_INVALID`);
  }
  return clean;
}

function applyResourceMap(
  balance: WorldProgressionBalance,
  value: unknown,
  sign: 1 | -1,
  label: 'grant' | 'cost',
): void {
  const resourceMap = validatePersistedResourceMap(value, label);
  for (const [resource, amount] of Object.entries(resourceMap) as Array<
    [WorldProgressionResource, number]
  >) {
    balance[resource] += sign * amount;
    if (balance[resource] < 0) {
      throw new Error('WORLD_PROGRESSION_PERSISTED_BALANCE_NEGATIVE');
    }
  }
}

export async function readPostgresWorldProgressionBalance(
  ownerId: string,
  database: Database = db,
): Promise<WorldProgressionBalance> {
  const [eventRows, spendRows] = await Promise.all([
    database
      .select({ grantsJson: worldProgressionEvents.grantsJson })
      .from(worldProgressionEvents)
      .where(eq(worldProgressionEvents.ownerId, ownerId)),
    database
      .select({ costJson: worldResourceSpends.costJson })
      .from(worldResourceSpends)
      .where(eq(worldResourceSpends.ownerId, ownerId)),
  ]);

  const balance = emptyBalance();
  for (const row of eventRows) applyResourceMap(balance, row.grantsJson, 1, 'grant');
  for (const row of spendRows) applyResourceMap(balance, row.costJson, -1, 'cost');
  return balance;
}

/**
 * Durable G2 ledger implementation.
 *
 * Each append serializes on the Owner before checking both replay boundaries.
 * The database UNIQUE constraints remain the final anti-farming authority.
 */
export class PostgresWorldProgressionLedgerStore implements WorldProgressionLedgerStore {
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
    return row ? rowToEntry(row) : null;
  }

  async appendIfAbsent(
    entry: WorldProgressionLedgerEntry,
  ): Promise<WorldProgressionAppendResult> {
    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${entry.ownerId}::text, 0))`,
      );

      const [idempotentReplay] = await tx
        .select()
        .from(worldProgressionEvents)
        .where(and(
          eq(worldProgressionEvents.ownerId, entry.ownerId),
          eq(worldProgressionEvents.idempotencyKey, entry.idempotencyKey),
        ))
        .limit(1);
      if (idempotentReplay) {
        return { inserted: false, entry: rowToEntry(idempotentReplay) };
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
        return { inserted: false, entry: rowToEntry(sourceReplay) };
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

      if (!inserted) throw new Error('WORLD_PROGRESSION_INSERT_FAILED');
      return { inserted: true, entry: rowToEntry(inserted) };
    });
  }

  async getBalance(ownerId: string): Promise<WorldProgressionBalance> {
    return readPostgresWorldProgressionBalance(ownerId, this.database);
  }
}

export const postgresWorldProgressionLedgerStore = new PostgresWorldProgressionLedgerStore();
