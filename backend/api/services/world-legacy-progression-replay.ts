import { createHash } from 'node:crypto';
import {
  WorldProgressionLedgerService,
  type WorldProgressionEventKind,
  type WorldProgressionRecordResult,
} from './world-progression-ledger';

export type LegacyWorldReplaySurface =
  | 'knowledge_cards_read'
  | 'saved_map_spots'
  | 'community_memberships';

const LEGACY_REPLAY_EVENT_KIND: Readonly<Record<
  LegacyWorldReplaySurface,
  WorldProgressionEventKind
>> = Object.freeze({
  knowledge_cards_read: 'knowledge.card_read',
  saved_map_spots: 'local.place_saved',
  community_memberships: 'world.group_joined',
});

export interface LegacyWorldReplayInput {
  ownerId: string;
  surface: string;
  legacyRecordId: string;
  canonicalSourceRef: string;
}

export interface LegacyWorldReplayResult extends WorldProgressionRecordResult {
  surface: LegacyWorldReplaySurface;
  eventKind: WorldProgressionEventKind;
}

export class LegacyWorldReplayError extends Error {
  constructor(
    readonly code:
      | 'WORLD_LEGACY_REPLAY_SURFACE_NOT_ALLOWED'
      | 'WORLD_LEGACY_REPLAY_INVALID_RECORD_ID',
    message: string,
  ) {
    super(message);
    this.name = 'LegacyWorldReplayError';
  }
}

/**
 * Controlled single-record legacy replay.
 *
 * No legacy aggregate count or caller-supplied reward quantity is accepted.
 * The event kind is server-derived from the bounded surface catalogue, the raw
 * legacy record id is hashed into an idempotency key, and canonical source
 * authorization remains delegated to the normal World progression ledger.
 */
export class LegacyWorldProgressionReplayImporter {
  constructor(private readonly ledger: WorldProgressionLedgerService) {}

  async replay(input: LegacyWorldReplayInput): Promise<LegacyWorldReplayResult> {
    const eventKind = resolveLegacyReplayEventKind(input.surface);
    const legacyRecordId = normalizeLegacyRecordId(input.legacyRecordId);

    const result = await this.ledger.record({
      ownerId: input.ownerId,
      idempotencyKey: deriveLegacyReplayIdempotencyKey(
        input.ownerId,
        input.surface as LegacyWorldReplaySurface,
        legacyRecordId,
      ),
      kind: eventKind,
      sourceRef: input.canonicalSourceRef,
    });

    return {
      ...result,
      surface: input.surface as LegacyWorldReplaySurface,
      eventKind,
    };
  }
}

export function resolveLegacyReplayEventKind(
  surface: string,
): WorldProgressionEventKind {
  if (!Object.prototype.hasOwnProperty.call(LEGACY_REPLAY_EVENT_KIND, surface)) {
    throw new LegacyWorldReplayError(
      'WORLD_LEGACY_REPLAY_SURFACE_NOT_ALLOWED',
      'Legacy surface is not approved for World progression replay.',
    );
  }
  return LEGACY_REPLAY_EVENT_KIND[surface as LegacyWorldReplaySurface];
}

export function deriveLegacyReplayIdempotencyKey(
  ownerId: string,
  surface: LegacyWorldReplaySurface,
  legacyRecordId: string,
): string {
  const digest = createHash('sha256')
    .update(ownerId)
    .update('\u0000')
    .update(surface)
    .update('\u0000')
    .update(legacyRecordId)
    .digest('hex')
    .slice(0, 40);

  return `legacy:${surface}:${digest}`;
}

function normalizeLegacyRecordId(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 512) {
    throw new LegacyWorldReplayError(
      'WORLD_LEGACY_REPLAY_INVALID_RECORD_ID',
      'Legacy record id must be 1-512 characters before hashing.',
    );
  }
  return normalized;
}
