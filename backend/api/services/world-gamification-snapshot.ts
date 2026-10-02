import type {
  WorldProgressionBalance,
  WorldProgressionLedgerEntry,
} from './world-progression-ledger.js';
import {
  projectWorldQuestProgress,
  type WorldQuestProgress,
} from './world-quest-projection.js';
import {
  projectWorldProgressionProvenance,
  type WorldProgressionProvenanceProjection,
} from './world-progression-provenance.js';
import {
  canAffordWorldRegionalItem,
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections.js';

export interface WorldGamificationOwnerBalance {
  ownerId: string;
  balance: WorldProgressionBalance;
}

export interface WorldGamificationOwnedItem {
  ownerId: string;
  itemId: string;
}

export interface WorldGamificationSnapshotItem {
  id: string;
  title: string;
  owned: boolean;
  affordable: boolean;
}

export interface WorldGamificationSnapshot {
  authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY';
  region: {
    code: string;
    identityName: string;
    themeId: string;
  };
  resources: WorldProgressionBalance;
  quests: WorldQuestProgress[];
  provenance: WorldProgressionProvenanceProjection;
  collectionItems: WorldGamificationSnapshotItem[];
  ownedItemIds: string[];
}

/**
 * API-ready G1 snapshot.
 *
 * Deliberately absent: XP, level, rank, streak, dog score, health score,
 * relationship score, ELI value, sensor value and exact location.
 */
export function buildWorldGamificationSnapshot(input: {
  ownerId: string;
  ownerBalance: WorldGamificationOwnerBalance;
  ledgerEntries: readonly WorldProgressionLedgerEntry[];
  ownedItems: readonly WorldGamificationOwnedItem[];
  regionalCatalog: WorldRegionalCollectionCatalog;
  regionCode: string | null | undefined;
}): WorldGamificationSnapshot {
  if (input.ownerBalance.ownerId !== input.ownerId) {
    throw new Error('WORLD_GAMIFICATION_BALANCE_OWNER_SCOPE_MISMATCH');
  }

  const ownedIds: string[] = [];
  const seenOwnedIds = new Set<string>();
  for (const row of input.ownedItems) {
    if (row.ownerId !== input.ownerId) {
      throw new Error('WORLD_GAMIFICATION_OWNED_ITEM_OWNER_SCOPE_MISMATCH');
    }
    if (seenOwnedIds.has(row.itemId)) {
      throw new Error('WORLD_GAMIFICATION_DUPLICATE_OWNED_ITEM');
    }
    seenOwnedIds.add(row.itemId);
    ownedIds.push(row.itemId);
  }

  const collection = resolveWorldRegionalCollection(input.regionalCatalog, input.regionCode);
  const balance = input.ownerBalance.balance;

  return {
    authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
    region: {
      code: collection.regionCode,
      identityName: collection.identity.name,
      themeId: collection.identity.themeId,
    },
    resources: { ...balance },
    quests: projectWorldQuestProgress(input.ownerId, input.ledgerEntries),
    provenance: projectWorldProgressionProvenance({
      ownerId: input.ownerId,
      entries: input.ledgerEntries,
    }),
    collectionItems: collection.items.map((item) => ({
      id: item.id,
      title: item.title,
      owned: seenOwnedIds.has(item.id),
      affordable: seenOwnedIds.has(item.id)
        ? false
        : canAffordWorldRegionalItem(balance, item),
    })),
    ownedItemIds: ownedIds,
  };
}
