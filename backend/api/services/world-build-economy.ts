import type { WorldProgressionBalance } from './world-progression-ledger.js';
import {
  canAffordWorldRegionalItem,
  spendWorldRegionalItemCost,
  type WorldRegionalCollection,
} from './world-regional-collections.js';

export type WorldBuildDecision =
  | 'built'
  | 'already_owned'
  | 'unknown_item'
  | 'insufficient_resources';

export interface WorldBuildOwnerBalance {
  ownerId: string;
  balance: WorldProgressionBalance;
}

export interface WorldBuildOwnedItem {
  ownerId: string;
  itemId: string;
}

export interface WorldBuildPlan {
  decision: WorldBuildDecision;
  itemId: string;
  balance: WorldProgressionBalance;
  ownedItemIds: string[];
}

/**
 * G1D deterministic build projection.
 *
 * This function is intentionally side-effect free. Durable runtime code must
 * perform the equivalent decision atomically with persistence so two concurrent
 * requests cannot double-spend the same balance.
 */
export function planWorldBuild(input: {
  ownerId: string;
  ownerBalance: WorldBuildOwnerBalance;
  ownedItems: readonly WorldBuildOwnedItem[];
  collection: WorldRegionalCollection;
  itemId: string;
}): WorldBuildPlan {
  if (!input.ownerId) {
    throw new Error('WORLD_BUILD_OWNER_REQUIRED');
  }
  if (input.ownerBalance.ownerId !== input.ownerId) {
    throw new Error('WORLD_BUILD_BALANCE_OWNER_SCOPE_MISMATCH');
  }

  const owned: string[] = [];
  const seenOwned = new Set<string>();
  for (const row of input.ownedItems) {
    if (row.ownerId !== input.ownerId) {
      throw new Error('WORLD_BUILD_OWNED_ITEM_OWNER_SCOPE_MISMATCH');
    }
    if (seenOwned.has(row.itemId)) {
      throw new Error('WORLD_BUILD_DUPLICATE_OWNED_ITEM');
    }
    seenOwned.add(row.itemId);
    owned.push(row.itemId);
  }

  const balance = input.ownerBalance.balance;
  const item = input.collection.items.find((candidate) => candidate.id === input.itemId);

  if (!item) {
    return {
      decision: 'unknown_item',
      itemId: input.itemId,
      balance: { ...balance },
      ownedItemIds: owned,
    };
  }

  if (owned.includes(item.id)) {
    return {
      decision: 'already_owned',
      itemId: item.id,
      balance: { ...balance },
      ownedItemIds: owned,
    };
  }

  if (!canAffordWorldRegionalItem(balance, item)) {
    return {
      decision: 'insufficient_resources',
      itemId: item.id,
      balance: { ...balance },
      ownedItemIds: owned,
    };
  }

  return {
    decision: 'built',
    itemId: item.id,
    balance: spendWorldRegionalItemCost(balance, item),
    ownedItemIds: [...owned, item.id],
  };
}

