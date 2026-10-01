import type {
  WorldProgressionBalance,
  WorldProgressionLedgerEntry,
} from './world-progression-ledger';
import {
  projectWorldQuestProgress,
  type WorldQuestProgress,
} from './world-quest-projection';
import {
  projectWorldProgressionProvenance,
  type WorldProgressionProvenanceProjection,
} from './world-progression-provenance';
import {
  canAffordWorldRegionalItem,
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections';

export interface WorldOwnerScopedResourceState {
  ownerId: string;
  balance: WorldProgressionBalance;
}

export interface WorldOwnerScopedOwnershipState {
  ownerId: string;
  itemIds: readonly string[];
}

export interface WorldGamificationSnapshotItem {
  id: string;
  title: string;
  owned: boolean;
  affordable: boolean;
}

export interface WorldGamificationOwnerBalance {
  ownerId: string;
  balance: WorldProgressionBalance;
}

export interface WorldGamificationOwnedItem {
  ownerId: string;
  itemId: string;
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
  resourceState: WorldOwnerScopedResourceState;
  ledgerEntries: readonly WorldProgressionLedgerEntry[];
  ownershipState: WorldOwnerScopedOwnershipState;
  regionalCatalog: WorldRegionalCollectionCatalog;
  regionCode: string | null | undefined;
}): WorldGamificationSnapshot {
  if (input.resourceState.ownerId !== input.ownerId) {
    throw new Error('WORLD_GAMIFICATION_RESOURCE_OWNER_SCOPE_MISMATCH');
  }
  if (input.ownershipState.ownerId !== input.ownerId) {
    throw new Error('WORLD_GAMIFICATION_OWNERSHIP_OWNER_SCOPE_MISMATCH');
  }

  const collection = resolveWorldRegionalCollection(input.regionalCatalog, input.regionCode);
  const balance = input.resourceState.balance;
  const owned = [...new Set(input.ownershipState.itemIds)];

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
      owned: owned.includes(item.id),
      affordable: owned.includes(item.id)
        ? false
        : canAffordWorldRegionalItem(balance, item),
    })),
    ownedItemIds: owned,
  };
}
