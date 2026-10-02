import type {
  WorldProgressionEventKind,
  WorldProgressionLedgerEntry,
} from './world-progression-ledger.js';

export type WorldQuestCategory = 'learning' | 'local' | 'community' | 'world' | 'memory';

export interface WorldQuestDefinition {
  id: string;
  title: string;
  eventKind: WorldProgressionEventKind;
  targetDistinctSources: number;
  category: WorldQuestCategory;
}

export interface WorldQuestProgress {
  id: string;
  title: string;
  category: WorldQuestCategory;
  eventKind: WorldProgressionEventKind;
  current: number;
  target: number;
  completed: boolean;
}

/**
 * G1C quest projection.
 *
 * Progress is derived only from already-authorized World progression ledger rows.
 * It never accepts raw Care, ELI, sensor or dog-performance data.
 */
export const WORLD_QUEST_CATALOG: readonly WorldQuestDefinition[] = Object.freeze([
  Object.freeze({
    id: 'learn-three',
    title: 'Read 3 knowledge cards',
    eventKind: 'knowledge.card_read',
    targetDistinctSources: 3,
    category: 'learning',
  }),
  Object.freeze({
    id: 'local-scout-three',
    title: 'Save 3 useful local places',
    eventKind: 'local.place_saved',
    targetDistinctSources: 3,
    category: 'local',
  }),
  Object.freeze({
    id: 'route-cartographer-two',
    title: 'Save 2 routes',
    eventKind: 'local.route_saved',
    targetDistinctSources: 2,
    category: 'local',
  }),
  Object.freeze({
    id: 'community-seed-two',
    title: 'Create 2 community contributions',
    eventKind: 'community.contribution_created',
    targetDistinctSources: 2,
    category: 'community',
  }),
  Object.freeze({
    id: 'join-one-world-group',
    title: 'Join a World group',
    eventKind: 'world.group_joined',
    targetDistinctSources: 1,
    category: 'world',
  }),
  Object.freeze({
    id: 'memory-keeper-three',
    title: 'Create 3 memories',
    eventKind: 'memory.created',
    targetDistinctSources: 3,
    category: 'memory',
  }),
]);

export function projectWorldQuestProgress(
  ownerId: string,
  entries: readonly WorldProgressionLedgerEntry[],
): WorldQuestProgress[] {
  if (!ownerId) {
    throw new Error('WORLD_QUEST_OWNER_SCOPE_REQUIRED');
  }

  const distinctSourcesByKind = new Map<WorldProgressionEventKind, Set<string>>();

  for (const entry of entries) {
    if (entry.ownerId !== ownerId) {
      throw new Error('WORLD_QUEST_OWNER_SCOPE_MISMATCH');
    }
    let sources = distinctSourcesByKind.get(entry.kind);
    if (!sources) {
      sources = new Set<string>();
      distinctSourcesByKind.set(entry.kind, sources);
    }
    sources.add(entry.sourceRef);
  }

  return WORLD_QUEST_CATALOG.map((quest) => {
    const count = distinctSourcesByKind.get(quest.eventKind)?.size ?? 0;
    const current = Math.min(count, quest.targetDistinctSources);

    return {
      id: quest.id,
      title: quest.title,
      category: quest.category,
      eventKind: quest.eventKind,
      current,
      target: quest.targetDistinctSources,
      completed: current >= quest.targetDistinctSources,
    };
  });
}
