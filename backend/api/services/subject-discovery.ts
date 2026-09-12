import { eq, inArray, or, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  achievements,
  aiMessages,
  baselines,
  comments,
  communities,
  communityEvents,
  communityMembers,
  copresenceEvents,
  devices,
  dogs,
  eliStates,
  healthEntries,
  posts,
  sensorSummaries,
  subscriptions,
  users,
} from '../../db/schema/index.js';
import { findOwnedDog, isCanonicalSubjectUuid } from './subject-access.js';

export type DiscoveryStatus =
  | 'DISCOVERED'
  | 'NONE_FOUND'
  | 'UNRESOLVED_IDENTITY_MAPPING'
  | 'EXTERNAL_DELETION_NOT_PROVEN'
  | 'NOT_PERSISTED_BY_CURRENT_BACKEND'
  | 'GATED_CANDIDATE_SCHEMA';

export interface DiscoverySurface {
  status: DiscoveryStatus;
  count: number | null;
  ids?: string[];
  externalReferenceCount?: number;
  note?: string;
}

export interface SubjectDiscoverySuccess {
  ok: true;
  subject: {
    userId: string;
    requestedDogId: string | null;
    selectedDogIds: string[];
  };
  guardian: {
    account: DiscoverySurface;
    ownedDogs: DiscoverySurface;
    subscriptions: DiscoverySurface;
    achievements: DiscoverySurface;
    communityMemberships: DiscoverySurface;
    communitiesCreated: DiscoverySurface;
    postsAuthored: DiscoverySurface;
    commentsAuthored: DiscoverySurface;
    communityEventsCreated: DiscoverySurface;
    aiMessagesTargetingUser: DiscoverySurface;
  };
  dog: {
    profiles: DiscoverySurface;
    devices: DiscoverySurface;
    healthEntries: DiscoverySurface;
    sensorSummaries: DiscoverySurface;
    coreEliStates: DiscoverySurface;
    baselines: DiscoverySurface;
    aiMessagesTargetingDog: DiscoverySurface;
    copresenceEvents: DiscoverySurface;
  };
  unresolved: {
    eliV5SharedIdentity: DiscoverySurface;
    contactJsonStore: DiscoverySurface;
    journalJsonStore: DiscoverySurface;
    profileMediaObjects: DiscoverySurface;
    communityPostMediaObjects: DiscoverySurface;
    providerHeldCopies: DiscoverySurface;
    cachesSearchVectorAnalytics: DiscoverySurface;
    backups: DiscoverySurface;
    vetReportShareGrants: DiscoverySurface;
    rawHighRateSensorStreams: DiscoverySurface;
  };
}

export interface SubjectDiscoveryFailure {
  ok: false;
  error: 'invalid_user_id' | 'invalid_dog_id' | 'user_not_found' | 'dog_not_found';
}

export type SubjectDiscoveryResult = SubjectDiscoverySuccess | SubjectDiscoveryFailure;

function surface(count: number, extra: Omit<DiscoverySurface, 'status' | 'count'> = {}): DiscoverySurface {
  return {
    status: count > 0 ? 'DISCOVERED' : 'NONE_FOUND',
    count,
    ...extra,
  };
}

function unresolved(
  status: Exclude<DiscoveryStatus, 'DISCOVERED' | 'NONE_FOUND'>,
  note: string,
  extra: Omit<DiscoverySurface, 'status' | 'count' | 'note'> = {},
): DiscoverySurface {
  return {
    status,
    count: null,
    note,
    ...extra,
  };
}

function countValue(rows: Array<{ count: number }>): number {
  return Number(rows[0]?.count ?? 0);
}

function mediaReferenceCount(rows: Array<{ mediaUrls: unknown }>): number {
  return rows.reduce((total, row) => {
    if (Array.isArray(row.mediaUrls)) return total + row.mediaUrls.length;
    return row.mediaUrls == null ? total : total + 1;
  }, 0);
}

/**
 * Read-only PRIV-DISC-01 subject discovery.
 *
 * This service deliberately performs no DELETE/UPDATE/anonymisation/revocation calls.
 * It returns counts, canonical IDs where needed for graph traversal, and explicit
 * unresolved states for stores/providers that the current backend cannot authoritatively
 * bind to a Guardian/dog identity.
 */
export async function discoverSubjectData(userId: string, requestedDogId?: string): Promise<SubjectDiscoveryResult> {
  if (!isCanonicalSubjectUuid(userId)) {
    return { ok: false, error: 'invalid_user_id' };
  }
  if (requestedDogId !== undefined && !isCanonicalSubjectUuid(requestedDogId)) {
    return { ok: false, error: 'invalid_dog_id' };
  }

  const [userRow] = await db
    .select({ id: users.id, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) {
    return { ok: false, error: 'user_not_found' };
  }

  const ownedDogRows = await db
    .select({ id: dogs.id, photoUrl: dogs.photoUrl })
    .from(dogs)
    .where(eq(dogs.ownerId, userId));

  let selectedDogRows = ownedDogRows;
  if (requestedDogId !== undefined) {
    const ownedDog = await findOwnedDog(userId, requestedDogId);
    if (!ownedDog) {
      // Fail closed so callers cannot use discovery as a cross-Guardian dog oracle.
      return { ok: false, error: 'dog_not_found' };
    }
    selectedDogRows = ownedDogRows.filter((row) => row.id === requestedDogId);
  }

  const selectedDogIds = selectedDogRows.map((row) => row.id);

  const [
    subscriptionCountRows,
    achievementCountRows,
    membershipCountRows,
    communitiesCreatedCountRows,
    postsAuthoredCountRows,
    authoredPostMediaRows,
    commentsAuthoredCountRows,
    eventsCreatedCountRows,
    userAiCountRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(subscriptions).where(eq(subscriptions.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(achievements).where(eq(achievements.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(communityMembers).where(eq(communityMembers.userId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(communities).where(eq(communities.createdBy, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(posts).where(eq(posts.authorId, userId)),
    db.select({ mediaUrls: posts.mediaUrls }).from(posts).where(eq(posts.authorId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(comments).where(eq(comments.authorId, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(communityEvents).where(eq(communityEvents.createdBy, userId)),
    db.select({ count: sql<number>`count(*)::int` }).from(aiMessages).where(eq(aiMessages.targetUserId, userId)),
  ]);

  let deviceCount = 0;
  let healthEntryCount = 0;
  let summaryCount = 0;
  let coreEliCount = 0;
  let baselineCount = 0;
  let dogAiCount = 0;
  let copresenceCount = 0;

  if (selectedDogIds.length > 0) {
    const [
      deviceCountRows,
      healthCountRows,
      summaryCountRows,
      eliCountRows,
      baselineCountRows,
      dogAiCountRows,
      copresenceCountRows,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(devices).where(inArray(devices.dogId, selectedDogIds)),
      db.select({ count: sql<number>`count(*)::int` }).from(healthEntries).where(inArray(healthEntries.dogId, selectedDogIds)),
      db.select({ count: sql<number>`count(*)::int` }).from(sensorSummaries).where(inArray(sensorSummaries.dogId, selectedDogIds)),
      db.select({ count: sql<number>`count(*)::int` }).from(eliStates).where(inArray(eliStates.dogId, selectedDogIds)),
      db.select({ count: sql<number>`count(*)::int` }).from(baselines).where(inArray(baselines.dogId, selectedDogIds)),
      db.select({ count: sql<number>`count(*)::int` }).from(aiMessages).where(inArray(aiMessages.dogId, selectedDogIds)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(copresenceEvents)
        .where(or(inArray(copresenceEvents.dogAId, selectedDogIds), inArray(copresenceEvents.dogBId, selectedDogIds))),
    ]);

    deviceCount = countValue(deviceCountRows);
    healthEntryCount = countValue(healthCountRows);
    summaryCount = countValue(summaryCountRows);
    coreEliCount = countValue(eliCountRows);
    baselineCount = countValue(baselineCountRows);
    dogAiCount = countValue(dogAiCountRows);
    copresenceCount = countValue(copresenceCountRows);
  }

  const profileMediaReferenceCount =
    (userRow.avatarUrl ? 1 : 0) + selectedDogRows.filter((row) => Boolean(row.photoUrl)).length;
  const communityMediaReferenceCount = mediaReferenceCount(authoredPostMediaRows);

  return {
    ok: true,
    subject: {
      userId,
      requestedDogId: requestedDogId ?? null,
      selectedDogIds,
    },
    guardian: {
      account: surface(1, { ids: [userRow.id] }),
      ownedDogs: surface(ownedDogRows.length, { ids: ownedDogRows.map((row) => row.id) }),
      subscriptions: surface(countValue(subscriptionCountRows)),
      achievements: surface(countValue(achievementCountRows)),
      communityMemberships: surface(countValue(membershipCountRows)),
      communitiesCreated: surface(countValue(communitiesCreatedCountRows)),
      postsAuthored: surface(countValue(postsAuthoredCountRows)),
      commentsAuthored: surface(countValue(commentsAuthoredCountRows)),
      communityEventsCreated: surface(countValue(eventsCreatedCountRows)),
      aiMessagesTargetingUser: surface(countValue(userAiCountRows)),
    },
    dog: {
      profiles: surface(selectedDogRows.length, { ids: selectedDogIds }),
      devices: surface(deviceCount),
      healthEntries: surface(healthEntryCount),
      sensorSummaries: surface(summaryCount),
      coreEliStates: surface(coreEliCount),
      baselines: surface(baselineCount),
      aiMessagesTargetingDog: surface(dogAiCount),
      copresenceEvents: surface(copresenceCount, {
        note: 'Current schema has UUID dog_a_id/dog_b_id without FK; discovery explicitly searches both columns.',
      }),
    },
    unresolved: {
      eliV5SharedIdentity: unresolved(
        'UNRESOLVED_IDENTITY_MAPPING',
        'CURRENT MAIN uses free-form TEXT shared identities in eli-v5 tables; do not guess subject linkage. ID-01 PR #71 is a non-merged candidate.',
      ),
      contactJsonStore: unresolved(
        'UNRESOLVED_IDENTITY_MAPPING',
        'Prototype contact persistence is keyed by ownerToken in .data/contact-requests.json, not canonical users.id.',
      ),
      journalJsonStore: unresolved(
        'UNRESOLVED_IDENTITY_MAPPING',
        'Prototype journal persistence is keyed by ownerToken in .data/journal-entries.json, not canonical user/dog UUIDs.',
      ),
      profileMediaObjects: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Database URL fields prove references only, not backing-object deletion capability.',
        { externalReferenceCount: profileMediaReferenceCount },
      ),
      communityPostMediaObjects: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Post media_urls are references; provider/object lifecycle is not proven by SQL discovery.',
        { externalReferenceCount: communityMediaReferenceCount },
      ),
      providerHeldCopies: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Production processor/provider register and provider-side deletion evidence remain open under PRIV-01.',
      ),
      cachesSearchVectorAnalytics: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'No canonical subject erasure registry currently proves coverage of caches/search/vector/analytics surfaces.',
      ),
      backups: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Backup expiry/deletion requires an approved backup policy and infrastructure evidence.',
      ),
      vetReportShareGrants: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Vet-report share grants are stateless signed JWTs; there is no per-grant SQL row to enumerate or revoke.',
      ),
      rawHighRateSensorStreams: unresolved(
        'NOT_PERSISTED_BY_CURRENT_BACKEND',
        'Current backend schema does not persist raw high-rate MAT/TAG streams.',
      ),
    },
  };
}
