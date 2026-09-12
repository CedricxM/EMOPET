import { eq, inArray, or, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  achievements,
  aiMessages,
  anticipationEvents,
  baselines,
  baselineDriftMonitor,
  comments,
  communities,
  communityEvents,
  communityMembers,
  communityReports,
  contactRequests,
  copresenceEvents,
  devices,
  dogSubBaselines,
  dogs,
  eliStates,
  healthEntries,
  posts,
  professionalShareGrants,
  recoveryEvents,
  routineStability,
  sensorSummaries,
  subscriptions,
  userConfig,
  users,
  walkQuality,
} from '../../db/schema/index.js';
import { findOwnedDog, isCanonicalSubjectUuid } from './subject-access.js';

export type DiscoveryStatus =
  | 'DISCOVERED'
  | 'NONE_FOUND'
  | 'EXTERNAL_DELETION_NOT_PROVEN'
  | 'NOT_PERSISTED_BY_CURRENT_BACKEND'
  | 'POLICY_AUTHORITY_OPEN';

export interface DiscoverySurface {
  status: DiscoveryStatus;
  count: number | null;
  ids?: string[];
  note?: string;
}

export interface SubjectDiscoveryFailure {
  ok: false;
  error: 'invalid_user_id' | 'invalid_dog_id' | 'user_not_found' | 'dog_not_found';
}

export interface SubjectDiscoverySuccess {
  ok: true;
  subject: {
    userId: string;
    requestedDogId: string | null;
    selectedDogIds: string[];
  };
  guardian: Record<string, DiscoverySurface>;
  dog: Record<string, DiscoverySurface>;
  externalOrUnresolved: Record<string, DiscoverySurface>;
}

export type SubjectDiscoveryResult = SubjectDiscoveryFailure | SubjectDiscoverySuccess;

function counted(count: number, extra: Omit<DiscoverySurface, 'status' | 'count'> = {}): DiscoverySurface {
  return {
    status: count > 0 ? 'DISCOVERED' : 'NONE_FOUND',
    count,
    ...extra,
  };
}

function unresolved(status: Exclude<DiscoveryStatus, 'DISCOVERED' | 'NONE_FOUND'>, note: string): DiscoverySurface {
  return { status, count: null, note };
}

function countValue(rows: Array<{ count: number }>): number {
  return Number(rows[0]?.count ?? 0);
}

async function countWhere(table: any, where: any): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(table).where(where);
  return countValue(rows);
}

/**
 * PRIV-DISC-01 read-only subject discovery.
 *
 * This service intentionally exposes counts / canonical IDs only. It performs
 * no DELETE, UPDATE, anonymisation, revocation or provider call and does not
 * claim complete DSAR/erasure coverage.
 */
export async function discoverSubjectData(
  userId: string,
  requestedDogId?: string,
): Promise<SubjectDiscoveryResult> {
  if (!isCanonicalSubjectUuid(userId)) return { ok: false, error: 'invalid_user_id' };
  if (requestedDogId !== undefined && !isCanonicalSubjectUuid(requestedDogId)) {
    return { ok: false, error: 'invalid_dog_id' };
  }

  const [userRow] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) return { ok: false, error: 'user_not_found' };

  const ownedDogs = await db.select({ id: dogs.id }).from(dogs).where(eq(dogs.ownerId, userId));
  let selectedDogIds = ownedDogs.map((row) => row.id);

  if (requestedDogId !== undefined) {
    const ownedDog = await findOwnedDog(userId, requestedDogId);
    if (!ownedDog) return { ok: false, error: 'dog_not_found' };
    selectedDogIds = [requestedDogId];
  }

  const guardianCounts = await Promise.all([
    countWhere(subscriptions, eq(subscriptions.userId, userId)),
    countWhere(achievements, eq(achievements.userId, userId)),
    countWhere(communityMembers, eq(communityMembers.userId, userId)),
    countWhere(communities, eq(communities.createdBy, userId)),
    countWhere(posts, eq(posts.authorId, userId)),
    countWhere(comments, eq(comments.authorId, userId)),
    countWhere(communityEvents, eq(communityEvents.createdBy, userId)),
    countWhere(communityReports, eq(communityReports.reporterUserId, userId)),
    countWhere(aiMessages, eq(aiMessages.targetUserId, userId)),
    countWhere(contactRequests, eq(contactRequests.requesterUserId, userId)),
    countWhere(professionalShareGrants, eq(professionalShareGrants.ownerUserId, userId)),
    countWhere(userConfig, eq(userConfig.userId, userId)),
  ]);

  let dogCounts = Array(15).fill(0) as number[];
  if (selectedDogIds.length > 0) {
    dogCounts = await Promise.all([
      countWhere(devices, inArray(devices.dogId, selectedDogIds)),
      countWhere(healthEntries, inArray(healthEntries.dogId, selectedDogIds)),
      countWhere(sensorSummaries, inArray(sensorSummaries.dogId, selectedDogIds)),
      countWhere(eliStates, inArray(eliStates.dogId, selectedDogIds)),
      countWhere(baselines, inArray(baselines.dogId, selectedDogIds)),
      countWhere(aiMessages, inArray(aiMessages.dogId, selectedDogIds)),
      countWhere(professionalShareGrants, inArray(professionalShareGrants.dogId, selectedDogIds)),
      countWhere(dogSubBaselines, inArray(dogSubBaselines.dogId, selectedDogIds)),
      countWhere(recoveryEvents, inArray(recoveryEvents.dogId, selectedDogIds)),
      countWhere(anticipationEvents, inArray(anticipationEvents.dogId, selectedDogIds)),
      countWhere(baselineDriftMonitor, inArray(baselineDriftMonitor.dogId, selectedDogIds)),
      countWhere(walkQuality, inArray(walkQuality.dogId, selectedDogIds)),
      countWhere(routineStability, inArray(routineStability.dogId, selectedDogIds)),
      countWhere(userConfig, inArray(userConfig.dogId, selectedDogIds)),
      countWhere(
        copresenceEvents,
        or(
          inArray(copresenceEvents.dogAId, selectedDogIds),
          inArray(copresenceEvents.dogBId, selectedDogIds),
        ),
      ),
    ]);
  }

  return {
    ok: true,
    subject: {
      userId,
      requestedDogId: requestedDogId ?? null,
      selectedDogIds,
    },
    guardian: {
      account: counted(1, { ids: [userRow.id] }),
      ownedDogs: counted(ownedDogs.length, { ids: ownedDogs.map((row) => row.id) }),
      subscriptions: counted(guardianCounts[0]),
      achievements: counted(guardianCounts[1]),
      communityMemberships: counted(guardianCounts[2]),
      communitiesCreated: counted(guardianCounts[3]),
      postsAuthored: counted(guardianCounts[4]),
      commentsAuthored: counted(guardianCounts[5]),
      communityEventsCreated: counted(guardianCounts[6]),
      communityReportsSubmitted: counted(guardianCounts[7]),
      aiMessagesTargetingUser: counted(guardianCounts[8]),
      contactRequests: counted(guardianCounts[9]),
      professionalShareGrantsOwned: counted(guardianCounts[10]),
      userConfig: counted(guardianCounts[11]),
    },
    dog: {
      profiles: counted(selectedDogIds.length, { ids: selectedDogIds }),
      devices: counted(dogCounts[0]),
      healthEntries: counted(dogCounts[1]),
      sensorSummaries: counted(dogCounts[2]),
      coreEliStates: counted(dogCounts[3]),
      baselines: counted(dogCounts[4]),
      aiMessagesTargetingDog: counted(dogCounts[5]),
      professionalShareGrants: counted(dogCounts[6]),
      eliDogSubBaselines: counted(dogCounts[7]),
      eliRecoveryEvents: counted(dogCounts[8]),
      eliAnticipationEvents: counted(dogCounts[9]),
      eliBaselineDriftMonitor: counted(dogCounts[10]),
      eliWalkQuality: counted(dogCounts[11]),
      eliRoutineStability: counted(dogCounts[12]),
      eliUserConfig: counted(dogCounts[13]),
      copresenceEvents: counted(dogCounts[14], {
        note: 'Discovery searches both unconstrained dog_a_id and dog_b_id columns.',
      }),
    },
    externalOrUnresolved: {
      journal: unresolved(
        'NOT_PERSISTED_BY_CURRENT_BACKEND',
        'No durable Product V1 Journal/Memory schema is present in the current backend.',
      ),
      rawHighRateSensorStreams: unresolved(
        'NOT_PERSISTED_BY_CURRENT_BACKEND',
        'Current backend does not persist raw high-rate MAT/TAG streams.',
      ),
      objectMediaStorage: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Database references do not prove backing-object deletion or provider lifecycle.',
      ),
      providerHeldCopies: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Provider-side copies require processor-specific evidence outside PostgreSQL discovery.',
      ),
      cachesSearchAnalyticsBackups: unresolved(
        'EXTERNAL_DELETION_NOT_PROVEN',
        'Caches, search/vector indexes, analytics identifiers and backups are not proven by this SQL dry-run.',
      ),
      erasureDisposition: unresolved(
        'POLICY_AUTHORITY_OPEN',
        'Discovery does not choose DELETE, ANONYMIZE, DETACH or RETAIN_WITH_JUSTIFICATION.',
      ),
    },
  };
}
