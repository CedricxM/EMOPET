import type { WorldRegionalCollectionCatalog } from './world-regional-collections.js';

/**
 * Runtime mirror of config/world/world-regional-collections-v1.json.
 *
 * A parity test binds this executable catalogue to the machine-readable
 * authority so production code never depends on source-tree JSON paths.
 */
export const WORLD_REGIONAL_COLLECTION_CATALOG: WorldRegionalCollectionCatalog = Object.freeze({
  version: '1',
  status: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
  selectionAuthority: 'explicit-coarse-region-code',
  exactLocationAccepted: false,
  automaticLocationReward: false,
  collections: [
    {
      regionCode: 'GLOBAL',
      identity: {
        name: 'EMOPET World',
        shortName: 'World',
        themeId: 'world-global',
      },
      items: [
        {
          id: 'memory-lantern',
          title: 'Memory lantern',
          cost: { memoryThreads: 4, knowledgeFragments: 2 },
        },
        {
          id: 'community-bench',
          title: 'Community bench',
          cost: { communitySeeds: 4, localDiscoveries: 2 },
        },
      ],
    },
    {
      regionCode: 'FR-BRE',
      identity: {
        name: 'Breiz',
        shortName: 'Breiz',
        themeId: 'world-bretagne',
      },
      items: [
        {
          id: 'breiz-mini-lighthouse',
          title: 'Mini lighthouse',
          cost: { localDiscoveries: 5, communitySeeds: 3 },
        },
        {
          id: 'breiz-granite-marker',
          title: 'Granite path marker',
          cost: { walkTraces: 4, localDiscoveries: 3 },
        },
        {
          id: 'breiz-coastal-bench',
          title: 'Coastal bench',
          cost: { memoryThreads: 3, communitySeeds: 3 },
        },
        {
          id: 'breiz-learning-sail',
          title: 'Learning sail',
          cost: { knowledgeFragments: 5, localDiscoveries: 2 },
        },
      ],
    },
  ],
});

export const WORLD_REGIONAL_COLLECTION_RULES = Object.freeze([
  'Region selection changes catalogue identity and cosmetics only.',
  'No reward is granted for merely being located in a region.',
  'Exact coordinates, address, geofence, distance travelled and passive location history are not accepted by this contract.',
  'Unknown region codes fall back to GLOBAL.',
  'Regional items spend only World resources already earned through authorised Owner actions.',
] as const);
