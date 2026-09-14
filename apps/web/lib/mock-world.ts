export type WorldResourceKey =
  | 'driftwood'
  | 'seaGlass'
  | 'gardenSeeds'
  | 'lanternLight'
  | 'mapInk'
  | 'storyThreads';

export type ResourceBalance = Record<WorldResourceKey, number>;

/**
 * World events are generated only by explicit activity inside World.
 * They are NOT sourced from MAT/TAG/ELI, dog activity, rest, distance, signal
 * quality, adherence, Memories quantity or relationship metrics.
 */
export type WorldEventType =
  | 'world_welcome_pack_opened'
  | 'world_area_explored'
  | 'world_workshop_completed'
  | 'world_coop_scene_completed'
  | 'world_story_fragment_found'
  | 'world_decoration_shared';

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
    key: 'driftwood',
    label: 'Bois flotté',
    shortLabel: 'Bois',
    description: 'Ressource fictive obtenue uniquement dans Mon monde.',
    color: 'var(--emopet-navy)',
  },
  {
    key: 'seaGlass',
    label: 'Verre marin',
    shortLabel: 'Verre',
    description: 'Ressource fictive de décoration, sans lien avec les données du chien.',
    color: 'var(--emopet-teal)',
  },
  {
    key: 'gardenSeeds',
    label: 'Graines du jardin',
    shortLabel: 'Graines',
    description: 'Ressource fictive issue des activités de jardinage dans World.',
    color: 'var(--lichen-500)',
  },
  {
    key: 'lanternLight',
    label: 'Lumière de lanterne',
    shortLabel: 'Lumière',
    description: 'Ressource fictive pour les objets lumineux de World.',
    color: 'var(--emopet-orange)',
  },
  {
    key: 'mapInk',
    label: 'Encre de carte',
    shortLabel: 'Encre',
    description: 'Ressource fictive utilisée pour explorer la carte interne de World.',
    color: 'var(--granit-500)',
  },
  {
    key: 'storyThreads',
    label: 'Fils d’histoire',
    shortLabel: 'Histoires',
    description: 'Ressource fictive liée aux fragments narratifs choisis dans World.',
    color: 'var(--emopet-orange)',
  },
];

export const EMPTY_RESOURCE_BALANCE: ResourceBalance = {
  driftwood: 0,
  seaGlass: 0,
  gardenSeeds: 0,
  lanternLight: 0,
  mapInk: 0,
  storyThreads: 0,
};

/**
 * Demo-only World events. Every grant below is produced by an in-World action.
 * No event is a proxy for real-dog performance, Care quality or sensor evidence.
 */
export const MOCK_WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'world-welcome',
    type: 'world_welcome_pack_opened',
    title: 'Paquet de bienvenue ouvert',
    detail: 'Quelques matériaux fictifs sont disponibles pour essayer l’atelier.',
    grants: { driftwood: 28, seaGlass: 18, gardenSeeds: 16, lanternLight: 12, mapInk: 12 },
  },
  {
    id: 'world-cove',
    type: 'world_area_explored',
    title: 'Crique virtuelle explorée',
    detail: 'Une zone de Mon monde a été visitée. Aucune donnée réelle du chien n’est utilisée.',
    grants: { seaGlass: 14, mapInk: 16 },
  },
  {
    id: 'world-workshop',
    type: 'world_workshop_completed',
    title: 'Petit atelier terminé',
    detail: 'Un mini tutoriel de construction dans World a été terminé.',
    grants: { driftwood: 14, gardenSeeds: 8 },
  },
  {
    id: 'world-coop',
    type: 'world_coop_scene_completed',
    title: 'Scène coopérative terminée',
    detail: 'Une activité sociale optionnelle de World a été terminée sans classement.',
    grants: { lanternLight: 14, gardenSeeds: 10 },
  },
  {
    id: 'world-story',
    type: 'world_story_fragment_found',
    title: 'Fragment d’histoire trouvé',
    detail: 'Un élément narratif de World a été découvert volontairement.',
    grants: { storyThreads: 18, mapInk: 8 },
  },
];

export const INITIAL_WORLD_ITEM_IDS = ['coast-path', 'garden-planting'];

export const WORLD_BUILD_ITEMS: WorldBuildItem[] = [
  {
    id: 'coast-path',
    title: 'Chemin côtier',
    category: 'Chemin',
    description: 'Un chemin purement décoratif dans Mon monde.',
    motif: 'pathMotif',
    cell: 24,
    cost: { driftwood: 12, seaGlass: 5 },
  },
  {
    id: 'garden-planting',
    title: 'Petit jardin',
    category: 'Jardin',
    description: 'Un coin végétal fictif à aménager.',
    motif: 'plantMotif',
    cell: 11,
    cost: { gardenSeeds: 10, driftwood: 6 },
  },
  {
    id: 'rest-blanket',
    title: 'Plaid de cabane',
    category: 'Décoration',
    description: 'Un textile décoratif de World. Il ne représente pas le repos réel du chien.',
    motif: 'blanketMotif',
    cell: 19,
    cost: { seaGlass: 8, storyThreads: 6 },
  },
  {
    id: 'paw-marker',
    title: 'Petit panneau patte',
    category: 'Décoration',
    description: 'Un marqueur visuel sans score ni signification comportementale.',
    motif: 'pawMotif',
    cell: 25,
    cost: { driftwood: 8, mapInk: 5 },
  },
  {
    id: 'lantern-pair',
    title: 'Paire de lanternes',
    category: 'Lumière',
    description: 'Deux lumières pour personnaliser une zone de World.',
    motif: 'lanternMotif',
    cell: 17,
    cost: { lanternLight: 10, seaGlass: 6 },
  },
  {
    id: 'local-sign',
    title: 'Panneau du port',
    category: 'Décor régional',
    description: 'Un élément breton fictif dans le monde, distinct de la carte locale réelle.',
    motif: 'signMotif',
    cell: 30,
    cost: { mapInk: 9, driftwood: 7 },
  },
  {
    id: 'wave-panel',
    title: 'Panneau vague',
    category: 'Côte',
    description: 'Une ligne de vague obtenue avec des ressources propres à World.',
    motif: 'waveMotif',
    cell: 4,
    cost: { seaGlass: 10, lanternLight: 5 },
  },
  {
    id: 'mini-lighthouse',
    title: 'Mini phare',
    category: 'Repère',
    description: 'Un petit phare inspiré de la côte bretonne.',
    motif: 'lighthouseMotif',
    cell: 6,
    cost: { driftwood: 10, lanternLight: 8, mapInk: 6 },
  },
  {
    id: 'bench-corner',
    title: 'Coin banc',
    category: 'Décoration',
    description: 'Un coin tranquille dans le décor, sans lecture du comportement réel.',
    motif: 'benchMotif',
    cell: 28,
    cost: { driftwood: 12, gardenSeeds: 6 },
  },
  {
    id: 'shell-line',
    title: 'Ligne de coquillages',
    category: 'Saisonnier',
    description: 'Un détail côtier purement cosmétique.',
    motif: 'shellMotif',
    cell: 33,
    cost: { seaGlass: 7, storyThreads: 5 },
  },
];

export const BASE_WORLD_TILES: Array<{ id: string; title: string; motif: TileMotif; cell: number }> = [
  { id: 'home', title: 'Petite maison', motif: 'houseMotif', cell: 18 },
  { id: 'tree', title: 'Lisière douce', motif: 'treeMotif', cell: 9 },
  { id: 'stone', title: 'Pierres du jardin', motif: 'stoneMotif', cell: 20 },
  { id: 'wave', title: 'Ligne de côte', motif: 'waveMotif', cell: 32 },
];

export const WORLD_QUESTS: WorldQuest[] = [
  {
    id: 'quest-world-cove',
    title: 'Explorer la crique virtuelle',
    detail: 'Une activité entièrement interne à World.',
    progress: 0,
    target: 1,
    resourceHint: 'seaGlass',
  },
  {
    id: 'quest-world-build',
    title: 'Placer une décoration',
    detail: 'Construisez uniquement si vous en avez envie. Aucun streak ni pénalité.',
    progress: 0,
    target: 1,
    resourceHint: 'driftwood',
  },
  {
    id: 'quest-world-story',
    title: 'Trouver un fragment d’histoire',
    detail: 'La narration de World est optionnelle et indépendante de Memories.',
    progress: 1,
    target: 1,
    resourceHint: 'storyThreads',
  },
  {
    id: 'quest-world-coop',
    title: 'Essayer une activité coopérative',
    detail: 'Pas de classement, pas de score de relation et aucune donnée ELI.',
    progress: 0,
    target: 1,
    resourceHint: 'lanternLight',
  },
];

export const COMMUNITY_WORLD: CommunityWorldState = {
  city: 'Lorient',
  headline: 'Un nouveau chemin partagé est visible dans la zone sociale de World.',
  updates: [
    'Une décoration coopérative a été ajoutée au port virtuel.',
    'Un nouvel espace de rencontre optionnel est disponible.',
    'Aucune donnée Care/ELI n’est utilisée pour classer ou récompenser ces contributions.',
  ],
  stats: [
    { label: 'Espaces partagés', value: '7' },
    { label: 'Décors coopératifs', value: '18' },
    { label: 'Contributions opt-in', value: '42' },
  ],
  nodes: [
    { label: 'Port virtuel', x: 18, y: 56, tone: 'teal' },
    { label: 'Crique', x: 38, y: 28, tone: 'orange' },
    { label: 'Jardin', x: 62, y: 48, tone: 'navy' },
    { label: 'Chemin partagé', x: 78, y: 22, tone: 'teal' },
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
