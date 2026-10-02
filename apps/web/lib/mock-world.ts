/**
 * World visual preview data.
 *
 * This module is deliberately NON-AUTHORITATIVE and NON-PERSISTENT.
 * It mirrors the controlled G1 resource / reward / Bretagne collection catalogues
 * closely enough to render the current web prototype without inventing a second
 * progression economy.
 *
 * Real balances, quests, provenance and ownership come only from the governed
 * backend World gamification read model once a canonical authenticated web
 * session exists. This file never turns Care, MAT, TAG, ELI, dog activity,
 * health, rest, distance or relationship signals into World rewards.
 */

export const WORLD_PREVIEW_AUTHORITY =
  'LOCAL_VISUAL_PREVIEW_NOT_ACCOUNT_PROGRESSION' as const;

export const WORLD_PREVIEW_NOTICE =
  'Aperçu local uniquement : ces valeurs ne sont ni votre solde de compte ni une progression enregistrée.';

export type WorldResourceKey =
  | 'knowledgeFragments'
  | 'localDiscoveries'
  | 'walkTraces'
  | 'communitySeeds'
  | 'memoryThreads';

export type ResourceBalance = Record<WorldResourceKey, number>;

export type WorldEventType =
  | 'knowledge.card_read'
  | 'local.place_saved'
  | 'local.route_saved'
  | 'community.contribution_created'
  | 'world.group_joined'
  | 'memory.created';

export type TileMotif =
  | 'pathMotif'
  | 'plantMotif'
  | 'stoneMotif'
  | 'lanternMotif'
  | 'benchMotif'
  | 'blanketMotif'
  | 'signMotif'
  | 'houseMotif'
  | 'treeMotif'
  | 'shellMotif'
  | 'pawMotif'
  | 'waveMotif'
  | 'lighthouseMotif';

export interface WorldResourceDefinition {
  key: WorldResourceKey;
  label: string;
  shortLabel: string;
  description: string;
  /** Accent décoratif utilisé sur fond sombre. */
  color: string;
  /** Encre suffisamment contrastée sur surfaces claires. */
  textColor: string;
}

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  title: string;
  detail: string;
  grants: Partial<ResourceBalance>;
  previewOnly: true;
}

export interface WorldBuildItem {
  id: string;
  title: string;
  category: string;
  description: string;
  motif: TileMotif;
  cell: number;
  cost: Partial<ResourceBalance>;
}

export interface WorldQuest {
  id: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  resourceHint: WorldResourceKey;
  previewOnly: true;
}

export interface CommunityWorldState {
  city: string;
  headline: string;
  updates: string[];
  stats: Array<{ label: string; value: string }>;
  nodes: Array<{ label: string; x: number; y: number; tone: 'navy' | 'orange' | 'teal' }>;
}

export const WORLD_RESOURCES: WorldResourceDefinition[] = [
  {
    key: 'knowledgeFragments',
    label: 'Knowledge Fragments',
    shortLabel: 'Knowledge',
    description: 'Owner-led learning actions after canonical source verification.',
    color: 'var(--emopet-navy)',
    textColor: 'var(--granit-800)',
  },
  {
    key: 'localDiscoveries',
    label: 'Local Discoveries',
    shortLabel: 'Local',
    description: 'Explicitly saved useful places or routes, never passive location.',
    color: 'var(--emopet-orange)',
    textColor: 'var(--terracotta-700)',
  },
  {
    key: 'walkTraces',
    label: 'Walk Traces',
    shortLabel: 'Routes',
    description: 'Explicit Owner-authored saved routes, never measured movement or distance.',
    color: 'var(--emopet-teal)',
    textColor: 'var(--lichen-700)',
  },
  {
    key: 'communitySeeds',
    label: 'Community Seeds',
    shortLabel: 'Community',
    description: 'Deliberate social actions only after canonical server verification.',
    color: 'var(--emopet-teal)',
    textColor: 'var(--lichen-700)',
  },
  {
    key: 'memoryThreads',
    label: 'Memory Threads',
    shortLabel: 'Memories',
    description: 'Deliberately created Memories once the canonical Memory authority is available.',
    color: 'var(--emopet-orange)',
    textColor: 'var(--terracotta-700)',
  },
];

export const EMPTY_RESOURCE_BALANCE: ResourceBalance = {
  knowledgeFragments: 0,
  localDiscoveries: 0,
  walkTraces: 0,
  communitySeeds: 0,
  memoryThreads: 0,
};

/**
 * A visual-only balance used to exercise affordability states in the prototype.
 * It is not derived from user behaviour and must never be exported as account state.
 */
export const PREVIEW_RESOURCE_BALANCE: ResourceBalance = {
  knowledgeFragments: 5,
  localDiscoveries: 8,
  walkTraces: 4,
  communitySeeds: 6,
  memoryThreads: 0,
};

/**
 * Canonical reward examples, not observed user events.
 *
 * Event kinds and grant amounts mirror
 * config/world/world-progression-authority-v1.json exactly. Runtime source
 * verification may still be blocked for some event kinds; these records exist
 * only to explain the governed catalogue in the visual preview.
 */
export const MOCK_WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'preview-knowledge-card',
    type: 'knowledge.card_read',
    title: 'Knowledge card read',
    detail: 'Catalogue example only. Account progression is not wired to this web preview.',
    grants: { knowledgeFragments: 1 },
    previewOnly: true,
  },
  {
    id: 'preview-local-place',
    type: 'local.place_saved',
    title: 'Useful local place saved',
    detail: 'Catalogue example only. A browser-only saved place is not reward evidence.',
    grants: { localDiscoveries: 2 },
    previewOnly: true,
  },
  {
    id: 'preview-local-route',
    type: 'local.route_saved',
    title: 'Route deliberately saved',
    detail: 'Catalogue example only. This means an explicit saved route, never measured distance.',
    grants: { walkTraces: 2, localDiscoveries: 1 },
    previewOnly: true,
  },
  {
    id: 'preview-community-contribution',
    type: 'community.contribution_created',
    title: 'Community contribution created',
    detail: 'Catalogue example only. Canonical server authorship is required before any reward.',
    grants: { communitySeeds: 2 },
    previewOnly: true,
  },
  {
    id: 'preview-world-group',
    type: 'world.group_joined',
    title: 'World group joined',
    detail: 'Catalogue example only. Durable World-group authority is still gated.',
    grants: { communitySeeds: 1 },
    previewOnly: true,
  },
  {
    id: 'preview-memory',
    type: 'memory.created',
    title: 'Memory deliberately created',
    detail: 'Catalogue example only. Product V1 Memory persistence is still gated.',
    grants: { memoryThreads: 2 },
    previewOnly: true,
  },
];

export const INITIAL_WORLD_ITEM_IDS: string[] = [];

/**
 * Bretagne collection preview.
 * IDs, titles and costs mirror config/world/world-regional-collections-v1.json.
 */
export const WORLD_BUILD_ITEMS: WorldBuildItem[] = [
  {
    id: 'breiz-mini-lighthouse',
    title: 'Mini lighthouse',
    category: 'Landmark',
    description: 'Bretagne collection preview item.',
    motif: 'lighthouseMotif',
    cell: 6,
    cost: { localDiscoveries: 5, communitySeeds: 3 },
  },
  {
    id: 'breiz-granite-marker',
    title: 'Granite path marker',
    category: 'Path',
    description: 'Bretagne collection preview item.',
    motif: 'stoneMotif',
    cell: 24,
    cost: { walkTraces: 4, localDiscoveries: 3 },
  },
  {
    id: 'breiz-coastal-bench',
    title: 'Coastal bench',
    category: 'Cozy object',
    description: 'Bretagne collection preview item.',
    motif: 'benchMotif',
    cell: 28,
    cost: { memoryThreads: 3, communitySeeds: 3 },
  },
  {
    id: 'breiz-learning-sail',
    title: 'Learning sail',
    category: 'Learning',
    description: 'Bretagne collection preview item.',
    motif: 'waveMotif',
    cell: 4,
    cost: { knowledgeFragments: 5, localDiscoveries: 2 },
  },
];

export const BASE_WORLD_TILES: Array<{ id: string; title: string; motif: TileMotif; cell: number }> = [
  { id: 'home', title: 'Cozy home', motif: 'houseMotif', cell: 18 },
  { id: 'tree', title: 'Soft forest edge', motif: 'treeMotif', cell: 9 },
  { id: 'stone', title: 'Garden stones', motif: 'stoneMotif', cell: 20 },
  { id: 'wave', title: 'Coast line', motif: 'waveMotif', cell: 32 },
];

/**
 * Quest catalogue preview. Progress is intentionally zero because this surface
 * is not connected to an authenticated durable World snapshot yet.
 */
export const WORLD_QUESTS: WorldQuest[] = [
  {
    id: 'learn-three',
    title: 'Read 3 knowledge cards',
    detail: 'Preview only. Runtime progress requires a canonical Knowledge source verifier.',
    progress: 0,
    target: 3,
    resourceHint: 'knowledgeFragments',
    previewOnly: true,
  },
  {
    id: 'local-scout-three',
    title: 'Save 3 useful local places',
    detail: 'Preview only. Browser localStorage is not canonical progression evidence.',
    progress: 0,
    target: 3,
    resourceHint: 'localDiscoveries',
    previewOnly: true,
  },
  {
    id: 'route-cartographer-two',
    title: 'Save 2 routes',
    detail: 'Preview only. Runtime progress requires durable Owner-authored route authority.',
    progress: 0,
    target: 2,
    resourceHint: 'walkTraces',
    previewOnly: true,
  },
  {
    id: 'community-seed-two',
    title: 'Create 2 community contributions',
    detail: 'Preview only. Canonical Community authorship is verified server-side.',
    progress: 0,
    target: 2,
    resourceHint: 'communitySeeds',
    previewOnly: true,
  },
  {
    id: 'join-one-world-group',
    title: 'Join a World group',
    detail: 'Preview only. Durable World-group membership authority is still gated.',
    progress: 0,
    target: 1,
    resourceHint: 'communitySeeds',
    previewOnly: true,
  },
  {
    id: 'memory-keeper-three',
    title: 'Create 3 memories',
    detail: 'Preview only. Product V1 Memory persistence is still gated.',
    progress: 0,
    target: 3,
    resourceHint: 'memoryThreads',
    previewOnly: true,
  },
];

export const COMMUNITY_WORLD: CommunityWorldState = {
  city: 'Lorient',
  headline: 'Lorient community preview',
  updates: [
    'Local social content is shown as a visual preview.',
    'World progression is not derived from passive dog or sensor signals.',
    'Exact location never grants World resources.',
  ],
  stats: [
    { label: 'Shared paths', value: '7' },
    { label: 'Quiet zones', value: '18' },
    { label: 'Opt-in places', value: '42' },
  ],
  nodes: [
    { label: 'Harbor path', x: 18, y: 56, tone: 'teal' },
    { label: 'Coastal walk', x: 38, y: 28, tone: 'orange' },
    { label: 'Garden route', x: 62, y: 48, tone: 'navy' },
    { label: 'Shared path', x: 78, y: 22, tone: 'teal' },
  ],
};

export function computeResourceBalance(events: WorldEvent[] = MOCK_WORLD_EVENTS): ResourceBalance {
  return events.reduce<ResourceBalance>(
    (balance, event) => addResources(balance, event.grants),
    { ...EMPTY_RESOURCE_BALANCE },
  );
}

export function addResources(balance: ResourceBalance, grants: Partial<ResourceBalance>): ResourceBalance {
  const next = { ...balance };
  for (const key of Object.keys(grants) as WorldResourceKey[]) {
    next[key] += grants[key] ?? 0;
  }
  return next;
}

export function canAfford(balance: ResourceBalance, cost: Partial<ResourceBalance>): boolean {
  return (Object.keys(cost) as WorldResourceKey[]).every((key) => balance[key] >= (cost[key] ?? 0));
}

export function spendResources(balance: ResourceBalance, cost: Partial<ResourceBalance>): ResourceBalance {
  const next = { ...balance };
  for (const key of Object.keys(cost) as WorldResourceKey[]) {
    next[key] = Math.max(0, next[key] - (cost[key] ?? 0));
  }
  return next;
}

export function getResourceDefinition(key: WorldResourceKey): WorldResourceDefinition {
  const resource = WORLD_RESOURCES.find((item) => item.key === key);
  if (!resource) throw new Error(`Unknown world resource: ${key}`);
  return resource;
}
