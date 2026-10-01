import { and, eq } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import { communityEvents, posts } from '../../db/schema/index.js';
import type { WorldProgressionSourceClaim } from './world-progression-ledger.js';
import type { WorldProgressionSourceVerifier } from './world-progression-source-authority.js';

export type CommunityContributionSourceType = 'post' | 'event';

export interface CommunityContributionSource {
  type: CommunityContributionSourceType;
  id: string;
}

export interface CommunityContributionSourceRepository {
  isPostAuthoredByOwner(ownerId: string, postId: string): Promise<boolean>;
  isEventCreatedByOwner(ownerId: string, eventId: string): Promise<boolean>;
}

const RESOURCE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * First canonical Community -> World progression source boundary.
 *
 * Only explicit durable contributions already persisted by the canonical
 * Community PostgreSQL authority are eligible:
 *
 * - community:post:<uuid>
 * - community:event:<uuid>
 *
 * Comments, likes, membership, moderation state, sensorOverlay, event location
 * and popularity are deliberately outside this verifier.
 */
export function parseCommunityContributionSourceRef(
  sourceRef: string,
): CommunityContributionSource | null {
  const match = /^community:(post|event):(.+)$/i.exec(sourceRef);
  if (!match) return null;

  const type = match[1]?.toLowerCase() as CommunityContributionSourceType | undefined;
  const id = match[2]?.toLowerCase();
  if (!type || !id || !RESOURCE_UUID_RE.test(id)) return null;

  return { type, id };
}

export function createCommunityContributionSourceVerifier(
  repository: CommunityContributionSourceRepository,
): WorldProgressionSourceVerifier {
  return async (claim: WorldProgressionSourceClaim): Promise<boolean> => {
    if (claim.kind !== 'community.contribution_created') return false;

    const source = parseCommunityContributionSourceRef(claim.sourceRef);
    if (!source) return false;

    if (source.type === 'post') {
      return repository.isPostAuthoredByOwner(claim.ownerId, source.id);
    }

    return repository.isEventCreatedByOwner(claim.ownerId, source.id);
  };
}

export function drizzleCommunityContributionSourceRepository(
  database: Database = db,
): CommunityContributionSourceRepository {
  return {
    async isPostAuthoredByOwner(ownerId, postId) {
      const [row] = await database
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.id, postId), eq(posts.authorId, ownerId)))
        .limit(1);

      return Boolean(row);
    },

    async isEventCreatedByOwner(ownerId, eventId) {
      const [row] = await database
        .select({ id: communityEvents.id })
        .from(communityEvents)
        .where(
          and(
            eq(communityEvents.id, eventId),
            eq(communityEvents.createdBy, ownerId),
          ),
        )
        .limit(1);

      return Boolean(row);
    },
  };
}

export function drizzleCommunityContributionSourceVerifier(
  database: Database = db,
): WorldProgressionSourceVerifier {
  return createCommunityContributionSourceVerifier(
    drizzleCommunityContributionSourceRepository(database),
  );
}
