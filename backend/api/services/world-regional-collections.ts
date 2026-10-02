import type {
  WorldProgressionBalance,
  WorldProgressionGrant,
  WorldProgressionResource,
} from './world-progression-ledger.js';

export interface WorldRegionalIdentity {
  name: string;
  shortName: string;
  themeId: string;
}

export interface WorldRegionalCollectionItem {
  id: string;
  title: string;
  cost: WorldProgressionGrant;
}

export interface WorldRegionalCollection {
  regionCode: string;
  identity: WorldRegionalIdentity;
  items: WorldRegionalCollectionItem[];
}

export interface WorldRegionalCollectionCatalog {
  version: string;
  status: string;
  selectionAuthority: 'explicit-coarse-region-code';
  exactLocationAccepted: false;
  automaticLocationReward: false;
  collections: WorldRegionalCollection[];
}

/**
 * Regional identity is selected only from an explicit coarse region code.
 *
 * No coordinates, address, distance, geofence, passive history or dog telemetry
 * are accepted by this boundary.
 */
export function resolveWorldRegionalCollection(
  catalog: WorldRegionalCollectionCatalog,
  regionCode: string | null | undefined,
): WorldRegionalCollection {
  const normalized = normalizeRegionCode(regionCode);
  const selected = catalog.collections.find((collection) => collection.regionCode === normalized);
  if (selected) return selected;

  const fallback = catalog.collections.find((collection) => collection.regionCode === 'GLOBAL');
  if (!fallback) throw new Error('World regional catalogue must define GLOBAL fallback.');
  return fallback;
}

export function canAffordWorldRegionalItem(
  balance: WorldProgressionBalance,
  item: WorldRegionalCollectionItem,
): boolean {
  return (Object.entries(item.cost) as Array<[WorldProgressionResource, number]>)
    .every(([resource, amount]) => amount > 0 && balance[resource] >= amount);
}

export function spendWorldRegionalItemCost(
  balance: WorldProgressionBalance,
  item: WorldRegionalCollectionItem,
): WorldProgressionBalance {
  if (!canAffordWorldRegionalItem(balance, item)) {
    throw new Error('WORLD_REGIONAL_ITEM_INSUFFICIENT_RESOURCES');
  }

  const next = { ...balance };
  for (const [resource, amount] of Object.entries(item.cost) as Array<[WorldProgressionResource, number]>) {
    next[resource] -= amount;
  }
  return next;
}

function normalizeRegionCode(regionCode: string | null | undefined): string {
  if (!regionCode) return 'GLOBAL';

  const normalized = regionCode.trim().toUpperCase();
  if (normalized === 'GLOBAL') return normalized;

  // ISO 3166-2 style coarse subdivision code only, e.g. FR-BRE.
  if (!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(normalized)) return 'GLOBAL';
  return normalized;
}
