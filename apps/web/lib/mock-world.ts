export type WorldResourceKey =
  | 'routinePoints'
  | 'observationQuality'
  | 'trustFragments'
  | 'walkTraces'
  | 'calmStones'
  | 'bondMoments'
  | 'communitySeeds'
  | 'signalClarity'
  | 'localDiscoveries';

export type ResourceBalance = Record<WorldResourceKey, number>;

export type WorldEventType =
  | 'reliable_rest_window_completed'
  | 'walk_added'
  | 'calm_place_discovered'
  | 'community_place_contributed'
  | 'signal_quality_high'
  | 'educational_tip_read'
  | 'mat_setup_completed';

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
  color: string;
}

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  title: string;
  detail: string;
  grants: Partial<ResourceBalance>;
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
    key: 'routinePoints',
    label: 'Routine Points',
    shortLabel: 'Routine',
    description: 'Care routines completed with gentle continuity.',
    color: 'var(--emopet-navy)',
  },
  {
    key: 'observationQuality',
    label: 'Observation Quality',
    shortLabel: 'Quality',
    description: 'Reliable observation windows and clear setup context.',
    color: 'var(--emopet-teal)',
  },
  {
    key: 'trustFragments',
    label: 'Trust Fragments',
    shortLabel: 'Trust',
    description: 'Owner engagement with setup, notes and learning.',
    color: 'var(--emopet-orange)',
  },
  {
    key: 'walkTraces',
    label: 'Walk Traces',
    shortLabel: 'Walks',
    description: 'Walk notes and route additions.',
    color: 'var(--emopet-teal)',
  },
  {
    key: 'calmStones',
    label: 'Calm Stones',
    shortLabel: 'Stones',
    description: 'Quiet places and rest-zone setup work.',
    color: 'var(--granit-500)',
  },
  {
    key: 'bondMoments',
    label: 'Bond Moments',
    shortLabel: 'Bond',
    description: 'Shared owner actions such as notes, learning and care tasks.',
    color: 'var(--emopet-orange)',
  },
  {
    key: 'communitySeeds',
    label: 'Community Seeds',
    shortLabel: 'Seeds',
    description: 'Opt-in local contributions.',
    color: 'var(--emopet-teal)',
  },
  {
    key: 'signalClarity',
    label: 'Signal Clarity',
    shortLabel: 'Signal',
    description: 'High-confidence MAT or TAG capture windows.',
    color: 'var(--emopet-navy)',
  },
  {
    key: 'localDiscoveries',
    label: 'Local Discoveries',
    shortLabel: 'Local',
    description: 'Dog-friendly places and walking route discoveries.',
    color: 'var(--emopet-orange)',
  },
];

export const EMPTY_RESOURCE_BALANCE: ResourceBalance = {
  routinePoints: 0,
  observationQuality: 0,
  trustFragments: 0,
  walkTraces: 0,
  calmStones: 0,
  bondMoments: 0,
  communitySeeds: 0,
  signalClarity: 0,
  localDiscoveries: 0,
};

export const MOCK_WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'event-rest-window',
    type: 'reliable_rest_window_completed',
    title: 'Reliable rest window completed',
    detail: 'MAT captured a complete reference window with 91% signal confidence.',
    grants: { routinePoints: 40, observationQuality: 30, signalClarity: 18, calmStones: 10 },
  },
  {
    id: 'event-walk-note',
    type: 'walk_added',
    title: 'Walk note added',
    detail: 'A coastal route was added with time, distance and surface notes.',
    grants: { walkTraces: 34, bondMoments: 12, localDiscoveries: 8 },
  },
  {
    id: 'event-place',
    type: 'calm_place_discovered',
    title: 'Quiet place discovered',
    detail: 'A low-traffic walking spot was saved for later review.',
    grants: { calmStones: 14, localDiscoveries: 18, communitySeeds: 6 },
  },
  {
    id: 'event-community',
    type: 'community_place_contributed',
    title: 'Local map contribution',
    detail: 'A dog-friendly place was shared with the Lorient map after opt-in.',
    grants: { communitySeeds: 26, localDiscoveries: 12, trustFragments: 10 },
  },
  {
    id: 'event-signal',
    type: 'signal_quality_high',
    title: 'High signal confidence',
    detail: 'TAG and MAT were aligned long enough to support careful interpretation.',
    grants: { signalClarity: 28, observationQuality: 16 },
  },
  {
    id: 'event-learning',
    type: 'educational_tip_read',
    title: 'Care tip read',
    detail: 'An educational card about steady setup routines was completed.',
    grants: { routinePoints: 12, trustFragments: 10, bondMoments: 8 },
  },
  {
    id: 'event-setup',
    type: 'mat_setup_completed',
    title: 'MAT setup checked',
    detail: 'The placement check confirmed a stable reference surface.',
    grants: { routinePoints: 18, signalClarity: 20, calmStones: 8 },
  },
];

export const INITIAL_WORLD_ITEM_IDS = ['coast-path', 'garden-planting'];

export const WORLD_BUILD_ITEMS: WorldBuildItem[] = [
  {
    id: 'coast-path',
    title: 'Coastal path tiles',
    category: 'Path',
    description: 'A soft route through the personal world.',
    motif: 'pathMotif',
    cell: 24,
    cost: { routinePoints: 16, walkTraces: 8 },
  },
  {
    id: 'garden-planting',
    title: 'Garden planting',
    category: 'Garden',
    description: 'Low plants and stones for a quiet corner.',
    motif: 'plantMotif',
    cell: 11,
    cost: { routinePoints: 12, calmStones: 8 },
  },
  {
    id: 'rest-blanket',
    title: 'Rest-zone blanket',
    category: 'Rest zone',
    description: 'A premium textile marker for the home area.',
    motif: 'blanketMotif',
    cell: 19,
    cost: { observationQuality: 16, calmStones: 10 },
  },
  {
    id: 'paw-marker',
    title: 'Paw marker',
    category: 'Marker',
    description: 'A small EMOPET signpost for a completed care step.',
    motif: 'pawMotif',
    cell: 25,
    cost: { trustFragments: 8, bondMoments: 8 },
  },
  {
    id: 'lantern-pair',
    title: 'Lantern pair',
    category: 'Light',
    description: 'Warm markers for evening route notes.',
    motif: 'lanternMotif',
    cell: 17,
    cost: { signalClarity: 14, routinePoints: 12 },
  },
  {
    id: 'local-sign',
    title: 'Local map sign',
    category: 'Local',
    description: 'A sign for a saved dog-friendly place.',
    motif: 'signMotif',
    cell: 30,
    cost: { localDiscoveries: 12, communitySeeds: 8 },
  },
  {
    id: 'wave-panel',
    title: 'Breton wave panel',
    category: 'Coast',
    description: 'A subtle wave line unlocked by clear signals.',
    motif: 'waveMotif',
    cell: 4,
    cost: { signalClarity: 18, observationQuality: 12 },
  },
  {
    id: 'mini-lighthouse',
    title: 'Mini lighthouse',
    category: 'Landmark',
    description: 'A Lorient-inspired landmark for shared local progress.',
    motif: 'lighthouseMotif',
    cell: 6,
    cost: { communitySeeds: 14, localDiscoveries: 12, signalClarity: 10 },
  },
  {
    id: 'bench-corner',
    title: 'Bench corner',
    category: 'Cozy object',
    description: 'A quiet sitting point built from care notes.',
    motif: 'benchMotif',
    cell: 28,
    cost: { bondMoments: 10, calmStones: 14 },
  },
  {
    id: 'shell-line',
    title: 'Shell line',
    category: 'Seasonal',
    description: 'A coastal detail unlocked through route discoveries.',
    motif: 'shellMotif',
    cell: 33,
    cost: { walkTraces: 12, localDiscoveries: 8 },
  },
];

export const BASE_WORLD_TILES: Array<{ id: string; title: string; motif: TileMotif; cell: number }> = [
  { id: 'home', title: 'Cozy home', motif: 'houseMotif', cell: 18 },
  { id: 'tree', title: 'Soft forest edge', motif: 'treeMotif', cell: 9 },
  { id: 'stone', title: 'Garden stones', motif: 'stoneMotif', cell: 20 },
  { id: 'wave', title: 'Coast line', motif: 'waveMotif', cell: 32 },
];

export const WORLD_QUESTS: WorldQuest[] = [
  {
    id: 'quest-rest',
    title: 'Complete 3 reliable rest observations this week',
    detail: 'Progress comes from capture quality and setup continuity.',
    progress: 2,
    target: 3,
    resourceHint: 'observationQuality',
  },
  {
    id: 'quest-route',
    title: 'Add one favorite walking route',
    detail: 'Route notes become Walk Traces and Local Discoveries.',
    progress: 0,
    target: 1,
    resourceHint: 'walkTraces',
  },
  {
    id: 'quest-tip',
    title: 'Read one educational care tip',
    detail: 'Learning actions support owner progression.',
    progress: 1,
    target: 1,
    resourceHint: 'trustFragments',
  },
  {
    id: 'quest-setup',
    title: 'Check signal quality after setting up the MAT',
    detail: 'High-confidence windows increase Signal Clarity.',
    progress: 1,
    target: 1,
    resourceHint: 'signalClarity',
  },
  {
    id: 'quest-local',
    title: 'Add a quiet place to the local map',
    detail: 'Community participation stays opt-in and cooperative.',
    progress: 0,
    target: 1,
    resourceHint: 'communitySeeds',
  },
];

export const COMMUNITY_WORLD: CommunityWorldState = {
  city: 'Lorient',
  headline: 'Lorient community unlocked a new shared path.',
  updates: [
    '3 quiet zones were added this week.',
    'Your contribution helped improve the local dog map.',
    'A new coastal walk has been discovered nearby.',
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
