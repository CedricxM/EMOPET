import type {
  WorldProgressionBalance,
  WorldProgressionLedgerEntry,
} from './world-progression-ledger';
import {
  projectWorldQuestProgress,
  type WorldQuestProgress,
} from './world-quest-projection';
import {
  canAffordWorldRegionalItem,
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections';

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
  balance: WorldProgressionBalance;
  ledgerEntries: readonly WorldProgressionLedgerEntry[];
  ownedItemIds: readonly string[];
  regionalCatalog: WorldRegionalCollectionCatalog;
  regionCode: string | null | undefined;
}): WorldGamificationSnapshot {
  const collection = resolveWorldRegionalCollection(input.regionalCatalog, input.regionCode);
  const owned = [...new Set(input.ownedItemIds)];

  return {
    authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
    region: {
      code: collection.regionCode,
      identityName: collection.identity.name,
      themeId: collection.identity.themeId,
    },
    resources: { ...input.balance },
    quests: projectWorldQuestProgress(input.ledgerEntries),
    collectionItems: collection.items.map((item) => ({
      id: item.id,
      title: item.title,
      owned: owned.includes(item.id),
      affordable: owned.includes(item.id)
        ? false
        : canAffordWorldRegionalItem(input.balance, item),
    })),
    ownedItemIds: owned,
  };
}
