import type {
  WorldProgressionBalance,
  WorldProgressionEventKind,
  WorldProgressionGrant,
  WorldProgressionLedgerEntry,
  WorldProgressionResource,
} from './world-progression-ledger.js';

export type WorldProgressionReasonCode =
  | 'knowledge_read'
  | 'local_place_saved'
  | 'local_route_saved'
  | 'community_contribution'
  | 'world_group_joined'
  | 'memory_created';

export const WORLD_PROGRESSION_REASON_CODES: Readonly<Record<
  WorldProgressionEventKind,
  WorldProgressionReasonCode
>> = Object.freeze({
  'knowledge.card_read': 'knowledge_read',
  'local.place_saved': 'local_place_saved',
  'local.route_saved': 'local_route_saved',
  'community.contribution_created': 'community_contribution',
  'world.group_joined': 'world_group_joined',
  'memory.created': 'memory_created',
});

export interface WorldProgressionProvenanceItem {
  eventId: string;
  reasonCode: WorldProgressionReasonCode;
  kind: WorldProgressionEventKind;
  sourceRef: string;
  grants: WorldProgressionGrant;
  recordedAt: string;
}

export interface WorldProgressionProvenanceProjection {
  authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY';
  ownerId: string;
  items: WorldProgressionProvenanceItem[];
  grossEarned: WorldProgressionBalance;
}

/**
 * G1G explainability projection for the World "why earned" surface.
 *
 * It emits only bounded reason codes and opaque source identifiers derived from
 * already-authorized ledger rows. No caller free text, exact location, Care,
 * ELI or dog telemetry is introduced here.
 */
export function projectWorldProgressionProvenance(input: {
  ownerId: string;
  entries: readonly WorldProgressionLedgerEntry[];
  limit?: number;
}): WorldProgressionProvenanceProjection {
  if (!input.ownerId) throw new Error('WORLD_PROGRESSION_PROVENANCE_OWNER_REQUIRED');

  const limit = input.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('WORLD_PROGRESSION_PROVENANCE_INVALID_LIMIT');
  }

  const seenIds = new Set<string>();
  for (const entry of input.entries) {
    if (entry.ownerId !== input.ownerId) {
      throw new Error('WORLD_PROGRESSION_PROVENANCE_OWNER_SCOPE_MISMATCH');
    }
    if (seenIds.has(entry.id)) {
      throw new Error('WORLD_PROGRESSION_PROVENANCE_DUPLICATE_ENTRY');
    }
    seenIds.add(entry.id);
  }

  const ordered = [...input.entries].sort((a, b) => {
    const timeDelta = b.recordedAt.getTime() - a.recordedAt.getTime();
    return timeDelta !== 0 ? timeDelta : b.id.localeCompare(a.id);
  });

  return {
    authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
    ownerId: input.ownerId,
    items: ordered.slice(0, limit).map((entry) => ({
      eventId: entry.id,
      reasonCode: WORLD_PROGRESSION_REASON_CODES[entry.kind],
      kind: entry.kind,
      sourceRef: entry.sourceRef,
      grants: { ...entry.grants },
      recordedAt: entry.recordedAt.toISOString(),
    })),
    grossEarned: computeGrossEarned(input.entries),
  };
}

function computeGrossEarned(
  entries: readonly WorldProgressionLedgerEntry[],
): WorldProgressionBalance {
  const total: WorldProgressionBalance = {
    knowledgeFragments: 0,
    localDiscoveries: 0,
    walkTraces: 0,
    communitySeeds: 0,
    memoryThreads: 0,
  };

  for (const entry of entries) {
    for (const [resource, amount] of Object.entries(entry.grants) as Array<
      [WorldProgressionResource, number]
    >) {
      total[resource] += amount;
    }
  }

  return total;
}
