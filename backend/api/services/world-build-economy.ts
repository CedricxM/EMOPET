import type { WorldProgressionBalance } from './world-progression-ledger';
import {
  canAffordWorldRegionalItem,
  spendWorldRegionalItemCost,
  type WorldRegionalCollection,
} from './world-regional-collections';

export type WorldBuildDecision =
  | 'built'
  | 'already_owned'
  | 'unknown_item'
  | 'insufficient_resources';

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
  balance: WorldProgressionBalance;
  ownedItemIds: readonly string[];
  collection: WorldRegionalCollection;
  itemId: string;
}): WorldBuildPlan {
  const owned = unique(input.ownedItemIds);
  const item = input.collection.items.find((candidate) => candidate.id === input.itemId);

  if (!item) {
    return {
      decision: 'unknown_item',
      itemId: input.itemId,
      balance: { ...input.balance },
      ownedItemIds: owned,
    };
  }

  if (owned.includes(item.id)) {
    return {
      decision: 'already_owned',
      itemId: item.id,
      balance: { ...input.balance },
      ownedItemIds: owned,
    };
  }

  if (!canAffordWorldRegionalItem(input.balance, item)) {
    return {
      decision: 'insufficient_resources',
      itemId: item.id,
      balance: { ...input.balance },
      ownedItemIds: owned,
    };
  }

  return {
    decision: 'built',
    itemId: item.id,
    balance: spendWorldRegionalItemCost(input.balance, item),
    ownedItemIds: [...owned, item.id],
  };
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}
