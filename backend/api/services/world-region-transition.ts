import {
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections';

export interface WorldRegionOwnedItem {
  ownerId: string;
  itemId: string;
}

export interface WorldRegionTransitionPlan {
  fromRegionCode: string;
  toRegionCode: string;
  fromIdentityName: string;
  toIdentityName: string;
  retainedOwnedItemIds: string[];
  activeCollectionItemIds: string[];
  ownedOutsideActiveCollectionIds: string[];
  newlyAvailableItemIds: string[];
}

/**
 * G1I regional transition planner.
 *
 * Region switching changes the active regional collection only. It never grants
 * resources, deletes ownership, expires items or reads exact location.
 */
export function planWorldRegionTransition(input: {
  ownerId: string;
  catalog: WorldRegionalCollectionCatalog;
  currentRegionCode: string | null | undefined;
  nextRegionCode: string | null | undefined;
  ownedItems: readonly WorldRegionOwnedItem[];
}): WorldRegionTransitionPlan {
  if (!input.ownerId) {
    throw new Error('WORLD_REGION_TRANSITION_OWNER_REQUIRED');
  }

  const from = resolveWorldRegionalCollection(input.catalog, input.currentRegionCode);
  const to = resolveWorldRegionalCollection(input.catalog, input.nextRegionCode);

  const owned: string[] = [];
  const seenOwned = new Set<string>();
  for (const row of input.ownedItems) {
    if (row.ownerId !== input.ownerId) {
      throw new Error('WORLD_REGION_TRANSITION_OWNED_ITEM_OWNER_SCOPE_MISMATCH');
    }
    if (seenOwned.has(row.itemId)) {
      throw new Error('WORLD_REGION_TRANSITION_DUPLICATE_OWNED_ITEM');
    }
    seenOwned.add(row.itemId);
    owned.push(row.itemId);
  }

  const activeIds = to.items.map((item) => item.id);
  const activeSet = new Set(activeIds);
  const ownedSet = new Set(owned);

  return {
    fromRegionCode: from.regionCode,
    toRegionCode: to.regionCode,
    fromIdentityName: from.identity.name,
    toIdentityName: to.identity.name,
    retainedOwnedItemIds: owned,
    activeCollectionItemIds: activeIds,
    ownedOutsideActiveCollectionIds: owned.filter((itemId) => !activeSet.has(itemId)),
    newlyAvailableItemIds: activeIds.filter((itemId) => !ownedSet.has(itemId)),
  };
}
