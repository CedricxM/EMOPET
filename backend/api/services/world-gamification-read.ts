import { eq, sql } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import {
  worldOwnedItems,
  worldProgressionEvents,
  worldResourceSpends,
} from '../../db/schema/index.js';
import { isCanonicalSubjectUuid } from './subject-access.js';
import {
  buildWorldGamificationSnapshot,
  type WorldGamificationSnapshot,
} from './world-gamification-snapshot.js';
import { WORLD_REGIONAL_COLLECTION_CATALOG } from './world-regional-catalog-runtime.js';
import {
  applyPersistedWorldResourceMap,
  emptyWorldProgressionBalance,
  worldProgressionRowToEntry,
} from './world-progression-postgres.js';

export interface WorldGamificationPublicProvenanceItem {
  eventId: string;
  reasonCode: WorldGamificationSnapshot['provenance']['items'][number]['reasonCode'];
  grants: WorldGamificationSnapshot['provenance']['items'][number]['grants'];
  recordedAt: string;
}

export interface WorldGamificationPublicSnapshot {
  authority: WorldGamificationSnapshot['authority'];
  region: WorldGamificationSnapshot['region'];
  resources: WorldGamificationSnapshot['resources'];
  quests: WorldGamificationSnapshot['quests'];
  whyEarned: {
    authority: WorldGamificationSnapshot['provenance']['authority'];
    items: WorldGamificationPublicProvenanceItem[];
    grossEarned: WorldGamificationSnapshot['provenance']['grossEarned'];
  };
  collectionItems: WorldGamificationSnapshot['collectionItems'];
  ownedItemIds: string[];
}

export class WorldGamificationReadError extends Error {
  constructor(
    readonly code:
      | 'WORLD_GAMIFICATION_INVALID_OWNER'
      | 'WORLD_GAMIFICATION_READ_INVARIANT',
    message: string,
  ) {
    super(message);
    this.name = 'WorldGamificationReadError';
  }
}

export async function readWorldGamificationSnapshot(input: {
  ownerId: string;
  regionCode?: string | null;
  database?: Database;
}): Promise<WorldGamificationPublicSnapshot> {
  if (!isCanonicalSubjectUuid(input.ownerId)) {
    throw new WorldGamificationReadError(
      'WORLD_GAMIFICATION_INVALID_OWNER',
      'World gamification owner must be a canonical UUID.',
    );
  }

  const database = input.database ?? db;
  return database.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);

    const [eventRows, spendRows, ownedRows] = await Promise.all([
      tx
        .select()
        .from(worldProgressionEvents)
        .where(eq(worldProgressionEvents.ownerId, input.ownerId)),
      tx
        .select({ costJson: worldResourceSpends.costJson })
        .from(worldResourceSpends)
        .where(eq(worldResourceSpends.ownerId, input.ownerId)),
      tx
        .select({
          ownerId: worldOwnedItems.ownerId,
          itemId: worldOwnedItems.itemId,
        })
        .from(worldOwnedItems)
        .where(eq(worldOwnedItems.ownerId, input.ownerId)),
    ]);

    const entries = eventRows.map(worldProgressionRowToEntry);
    const balance = emptyWorldProgressionBalance();
    for (const entry of entries) {
      applyPersistedWorldResourceMap(balance, entry.grants, 1, 'grant');
    }
    for (const row of spendRows) {
      applyPersistedWorldResourceMap(balance, row.costJson, -1, 'cost');
    }

    const snapshot = buildWorldGamificationSnapshot({
      ownerId: input.ownerId,
      ownerBalance: { ownerId: input.ownerId, balance },
      ledgerEntries: entries,
      ownedItems: ownedRows,
      regionalCatalog: WORLD_REGIONAL_COLLECTION_CATALOG,
      regionCode: input.regionCode,
    });

    return {
      authority: snapshot.authority,
      region: snapshot.region,
      resources: snapshot.resources,
      quests: snapshot.quests,
      whyEarned: {
        authority: snapshot.provenance.authority,
        items: snapshot.provenance.items.map((item) => ({
          eventId: item.eventId,
          reasonCode: item.reasonCode,
          grants: item.grants,
          recordedAt: item.recordedAt,
        })),
        grossEarned: snapshot.provenance.grossEarned,
      },
      collectionItems: snapshot.collectionItems,
      ownedItemIds: snapshot.ownedItemIds,
    };
  });
}
