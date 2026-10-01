import {
  resolveWorldRegionalCollection,
  type WorldRegionalCollectionCatalog,
} from './world-regional-collections';

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
  catalog: WorldRegionalCollectionCatalog;
  currentRegionCode: string | null | undefined;
  nextRegionCode: string | null | undefined;
  ownedItemIds: readonly string[];
}): WorldRegionTransitionPlan {
  const from = resolveWorldRegionalCollection(input.catalog, input.currentRegionCode);
  const to = resolveWorldRegionalCollection(input.catalog, input.nextRegionCode);

  const owned = [...input.ownedItemIds];
  if (new Set(owned).size !== owned.length) {
    throw new Error('WORLD_REGION_TRANSITION_DUPLICATE_OWNED_ITEM');
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
