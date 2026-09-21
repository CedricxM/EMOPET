import { eq, inArray, or, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  achievements,
  aiMessages,
  anticipationEvents,
  authRefreshSessions,
  baselines,
  baselineDriftMonitor,
  behavioralAssessments,
  behavioralFactorScores,
  behavioralResponses,
  comments,
  communities,
  communityEvents,
  communityMembers,
  communityReports,
  communityRulesAcceptances,
  copresenceEvents,
  devices,
  dogSubBaselines,
  dogs,
  eliBehavioralPriors,
  eliStates,
  healthEntries,
  posts,
  recoveryEvents,
  researchDataConsents,
  routineStability,
  sensorSummaries,
  subscriptions,
  userConfig,
  users,
  walkQuality,
} from '../../db/schema/index.js';
import { isCanonicalSubjectUuid } from './subject-access.js';

export type DiscoveryStatus =
  | 'DISCOVERED'
  | 'NONE_FOUND'
  | 'INTEGRATION_DEFERRED'
  | 'UNRESOLVED_IDENTITY_MAPPING'
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
  error:
    | 'invalid_user_id'
    | 'invalid_dog_id'
    | 'user_not_found'
    | 'dog_not_found'
    | 'database_unavailable';
  retryable?: boolean;
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

function counted(
  count: number,
  extra: Omit<DiscoverySurface, 'status' | 'count'> = {},
): DiscoverySurface {
  return {
    status: count > 0 ? 'DISCOVERED' : 'NONE_FOUND',
    count,
    ...extra,
  };
}

function unresolved(
  status: Exclude<DiscoveryStatus, 'DISCOVERED' | 'NONE_FOUND'>,
  note: string,
): DiscoverySurface {
  return { status, count: null, note };
}

function countValue(rows: Array<{ count: number }>): number {
  return Number(rows[0]?.count ?? 0);
}

async function countWhere(tx: any, table: any, where: any): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(table)
    .where(where);
  return countValue(rows);
}

/**
 * PRIV-DISC-01 read-only subject discovery.
 *
 * All current dog ownership authority is selected under FOR SHARE inside the
 * same bounded transaction as dog-linked counts. This prevents an ownership
 * transfer from committing halfway through a successful discovery report.
 *
 * The service exposes counts and safe canonical IDs only. It performs no
 * DELETE, UPDATE, anonymisation, revocation or provider call.
 */
export async function discoverSubjectData(
  userId: string,
  requestedDogId?: string,
): Promise<SubjectDiscoveryResult> {
  if (!isCanonicalSubjectUuid(userId)) return { ok: false, error: 'invalid_user_id' };
  if (requestedDogId !== undefined && !isCanonicalSubjectUuid(requestedDogId)) {
    return { ok: false, error: 'invalid_dog_id' };
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [userRow] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('share')
        .limit(1);

      if (!userRow) return { ok: false, error: 'user_not_found' } as const;

      // Lock the complete current owned-dog set before any dog-linked count.
      // Under READ COMMITTED, a concurrent transfer that wins first is
      // rechecked after the wait and no longer appears as owned by this user.
      const ownedDogs = await tx
        .select({ id: dogs.id })
        .from(dogs)
        .where(eq(dogs.ownerId, userId))
        .for('share');

      const ownedDogIds = ownedDogs.map((row) => row.id);

      if (requestedDogId !== undefined && !ownedDogIds.includes(requestedDogId)) {
        return { ok: false, error: 'dog_not_found' } as const;
      }

      const selectedDogIds = requestedDogId !== undefined
        ? [requestedDogId]
        : ownedDogIds;

      const guardian = {
        account: counted(1, { ids: [userRow.id] }),
        ownedDogs: counted(ownedDogIds.length, { ids: ownedDogIds }),
        subscriptions: counted(await countWhere(tx, subscriptions, eq(subscriptions.userId, userId))),
        achievements: counted(await countWhere(tx, achievements, eq(achievements.userId, userId))),
        aiMessagesTargetingUser: counted(await countWhere(tx, aiMessages, eq(aiMessages.targetUserId, userId))),
        authRefreshSessions: counted(await countWhere(tx, authRefreshSessions, eq(authRefreshSessions.userId, userId)), {
          note: 'Count only. Refresh token hashes and session internals are not disclosed.',
        }),
        behavioralAssessmentsAsRespondent: counted(
          await countWhere(tx, behavioralAssessments, eq(behavioralAssessments.respondentUserId, userId)),
        ),
        researchDataConsents: counted(
          await countWhere(tx, researchDataConsents, eq(researchDataConsents.userId, userId)),
        ),
        userConfig: counted(await countWhere(tx, userConfig, eq(userConfig.userId, userId))),
        communitiesCreated: counted(await countWhere(tx, communities, eq(communities.createdBy, userId))),
        communityMemberships: counted(await countWhere(tx, communityMembers, eq(communityMembers.userId, userId))),
        communityPostsAuthored: counted(await countWhere(tx, posts, eq(posts.authorId, userId))),
        communityCommentsAuthored: counted(await countWhere(tx, comments, eq(comments.authorId, userId))),
        communityEventsCreated: counted(await countWhere(tx, communityEvents, eq(communityEvents.createdBy, userId))),
        communityRulesAcceptances: counted(await countWhere(tx, communityRulesAcceptances, eq(communityRulesAcceptances.userId, userId))),
        communityReportsFiled: counted(await countWhere(tx, communityReports, eq(communityReports.reporterUserId, userId))),
      };

      let dogCounts = {
        devices: 0,
        healthEntries: 0,
        sensorSummaries: 0,
        coreEliStates: 0,
        baselines: 0,
        aiMessagesTargetingDog: 0,
        eliDogSubBaselines: 0,
        eliRecoveryEvents: 0,
        eliAnticipationEvents: 0,
        eliBaselineDriftMonitor: 0,
        eliWalkQuality: 0,
        eliRoutineStability: 0,
        eliUserConfig: 0,
        behavioralAssessments: 0,
        behavioralAssessmentsProduct: 0,
        behavioralAssessmentsResearch: 0,
        behavioralResponses: 0,
        behavioralFactorScores: 0,
        eliBehavioralPriors: 0,
        researchDataConsents: 0,
        copresenceEvents: 0,
      };

      if (selectedDogIds.length > 0) {
        const assessmentRows = await tx
          .select({
            id: behavioralAssessments.id,
            administrationMode: behavioralAssessments.administrationMode,
          })
          .from(behavioralAssessments)
          .where(inArray(behavioralAssessments.dogId, selectedDogIds));
        const assessmentIds = assessmentRows.map((row) => row.id);
        const behavioralAssessmentsResearch = assessmentRows.filter(
          (row) => row.administrationMode === 'research',
        ).length;
        const behavioralAssessmentsProduct = assessmentRows.length - behavioralAssessmentsResearch;

        dogCounts = {
          devices: await countWhere(tx, devices, inArray(devices.dogId, selectedDogIds)),
          healthEntries: await countWhere(tx, healthEntries, inArray(healthEntries.dogId, selectedDogIds)),
          sensorSummaries: await countWhere(tx, sensorSummaries, inArray(sensorSummaries.dogId, selectedDogIds)),
          coreEliStates: await countWhere(tx, eliStates, inArray(eliStates.dogId, selectedDogIds)),
          baselines: await countWhere(tx, baselines, inArray(baselines.dogId, selectedDogIds)),
          aiMessagesTargetingDog: await countWhere(tx, aiMessages, inArray(aiMessages.dogId, selectedDogIds)),
          eliDogSubBaselines: await countWhere(tx, dogSubBaselines, inArray(dogSubBaselines.dogId, selectedDogIds)),
          eliRecoveryEvents: await countWhere(tx, recoveryEvents, inArray(recoveryEvents.dogId, selectedDogIds)),
          eliAnticipationEvents: await countWhere(tx, anticipationEvents, inArray(anticipationEvents.dogId, selectedDogIds)),
          eliBaselineDriftMonitor: await countWhere(tx, baselineDriftMonitor, inArray(baselineDriftMonitor.dogId, selectedDogIds)),
          eliWalkQuality: await countWhere(tx, walkQuality, inArray(walkQuality.dogId, selectedDogIds)),
          eliRoutineStability: await countWhere(tx, routineStability, inArray(routineStability.dogId, selectedDogIds)),
          eliUserConfig: await countWhere(tx, userConfig, inArray(userConfig.dogId, selectedDogIds)),
          behavioralAssessments: assessmentIds.length,
          behavioralAssessmentsProduct,
          behavioralAssessmentsResearch,
          behavioralResponses: assessmentIds.length > 0
            ? await countWhere(tx, behavioralResponses, inArray(behavioralResponses.assessmentId, assessmentIds))
            : 0,
          behavioralFactorScores: assessmentIds.length > 0
            ? await countWhere(tx, behavioralFactorScores, inArray(behavioralFactorScores.assessmentId, assessmentIds))
            : 0,
          eliBehavioralPriors: await countWhere(tx, eliBehavioralPriors, inArray(eliBehavioralPriors.dogId, selectedDogIds)),
          researchDataConsents: await countWhere(tx, researchDataConsents, inArray(researchDataConsents.dogId, selectedDogIds)),
          copresenceEvents: await countWhere(
            tx,
            copresenceEvents,
            or(
              inArray(copresenceEvents.dogAId, selectedDogIds),
              inArray(copresenceEvents.dogBId, selectedDogIds),
            ),
          ),
        };
      }

      return {
        ok: true,
        subject: {
          userId,
          requestedDogId: requestedDogId ?? null,
          selectedDogIds,
        },
        guardian,
        dog: {
          profiles: counted(selectedDogIds.length, { ids: selectedDogIds }),
          devices: counted(dogCounts.devices),
          healthEntries: counted(dogCounts.healthEntries),
          sensorSummaries: counted(dogCounts.sensorSummaries),
          coreEliStates: counted(dogCounts.coreEliStates),
          baselines: counted(dogCounts.baselines),
          aiMessagesTargetingDog: counted(dogCounts.aiMessagesTargetingDog),
          eliDogSubBaselines: counted(dogCounts.eliDogSubBaselines),
          eliRecoveryEvents: counted(dogCounts.eliRecoveryEvents),
          eliAnticipationEvents: counted(dogCounts.eliAnticipationEvents),
          eliBaselineDriftMonitor: counted(dogCounts.eliBaselineDriftMonitor),
          eliWalkQuality: counted(dogCounts.eliWalkQuality),
          eliRoutineStability: counted(dogCounts.eliRoutineStability),
          eliUserConfig: counted(dogCounts.eliUserConfig),
          behavioralAssessments: counted(dogCounts.behavioralAssessments),
          behavioralAssessmentsProduct: counted(dogCounts.behavioralAssessmentsProduct, {
            note: 'Non-research administration modes. Existing erasure semantics classify these as product-side assessment rows.',
          }),
          behavioralAssessmentsResearch: counted(dogCounts.behavioralAssessmentsResearch, {
            note: 'Research administration mode. Product erasure must defer these rows to research governance authority.',
          }),
          behavioralResponses: counted(dogCounts.behavioralResponses),
          behavioralFactorScores: counted(dogCounts.behavioralFactorScores),
          eliBehavioralPriors: counted(dogCounts.eliBehavioralPriors),
          researchDataConsents: counted(dogCounts.researchDataConsents),
          copresenceEvents: counted(dogCounts.copresenceEvents),
        },
        externalOrUnresolved: {
          professionalSharing: unresolved(
            'INTEGRATION_DEFERRED',
            'Professional-sharing persistence is owned by INT-05 and is not reported as absent by INT-04B.',
          ),
          contactRequests: unresolved(
            'UNRESOLVED_IDENTITY_MAPPING',
            'Contact request storage uses a non-SQL owner-token mapping; PostgreSQL discovery cannot canonically bind or enumerate it yet.',
          ),
          journal: unresolved(
            'NOT_PERSISTED_BY_CURRENT_BACKEND',
            'No durable Product V1 Journal/Memory schema is present in the current INT-04B integration authority.',
          ),
          rawHighRateSensorStreams: unresolved(
            'NOT_PERSISTED_BY_CURRENT_BACKEND',
            'Current backend authority does not persist raw high-rate MAT/TAG streams.',
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
      } satisfies SubjectDiscoverySuccess;
    });
  } catch {
    return {
      ok: false,
      error: 'database_unavailable',
      retryable: true,
    };
  }
}
