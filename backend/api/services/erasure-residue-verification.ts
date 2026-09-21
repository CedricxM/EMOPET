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

export type ErasureVerificationScope = 'ACCOUNT' | 'DOG';

export interface ErasureVerificationSnapshot {
  schemaVersion: 'emopet-erasure-verification-snapshot-v1';
  scope: ErasureVerificationScope;
  accountId: string;
  dogIds: string[];
  assessmentIds: string[];
  factorScoreIds: string[];
}

export type ErasureSnapshotFailure = {
  ok: false;
  error:
    | 'invalid_user_id'
    | 'invalid_dog_id'
    | 'user_not_found'
    | 'dog_not_found'
    | 'database_unavailable';
  retryable?: boolean;
};

export type ErasureSnapshotResult =
  | { ok: true; snapshot: ErasureVerificationSnapshot }
  | ErasureSnapshotFailure;

export interface ErasureSqlProbe {
  key: string;
  count: number;
}

export interface ErasureNonSqlProbe {
  surface:
    | 'OBJECT_MEDIA_STORAGE'
    | 'PROVIDER_HELD_COPIES'
    | 'CACHES_SEARCH_INDEXES'
    | 'ANALYTICS_TELEMETRY'
    | 'BACKUPS';
  status: 'UNVERIFIED';
}

export interface ErasureResidueReport {
  ok: true;
  mode: 'VERIFY_ONLY';
  destructiveActionAuthorized: false;
  claimsCompleteErasure: false;
  snapshot: ErasureVerificationSnapshot;
  status: 'SQL_RESIDUE_PRESENT' | 'SQL_CLEAR_NON_SQL_UNVERIFIED';
  rootProbes: ErasureSqlProbe[];
  accountRelationProbes: ErasureSqlProbe[];
  dogRelationProbes: ErasureSqlProbe[];
  transitiveRelationProbes: ErasureSqlProbe[];
  nonSqlProbes: ErasureNonSqlProbe[];
  nonZeroSqlProbeCount: number;
}

export type ErasureResidueFailure = {
  ok: false;
  mode: 'VERIFY_ONLY';
  destructiveActionAuthorized: false;
  claimsCompleteErasure: false;
  error: 'invalid_snapshot' | 'database_unavailable';
  retryable?: boolean;
};

export type ErasureResidueResult = ErasureResidueReport | ErasureResidueFailure;

const NON_SQL_SURFACES: ErasureNonSqlProbe['surface'][] = [
  'OBJECT_MEDIA_STORAGE',
  'PROVIDER_HELD_COPIES',
  'CACHES_SEARCH_INDEXES',
  'ANALYTICS_TELEMETRY',
  'BACKUPS',
];

function sortedUniqueCanonicalIds(values: string[]): string[] | null {
  if (!Array.isArray(values)) return null;
  const unique = [...new Set(values)];
  if (unique.length !== values.length) return null;
  if (unique.some((value) => !isCanonicalSubjectUuid(value))) return null;
  return unique.sort();
}

function validSnapshot(
  snapshot: ErasureVerificationSnapshot,
): ErasureVerificationSnapshot | null {
  if (
    snapshot?.schemaVersion !== 'emopet-erasure-verification-snapshot-v1'
    || (snapshot?.scope !== 'ACCOUNT' && snapshot?.scope !== 'DOG')
    || !isCanonicalSubjectUuid(snapshot?.accountId)
  ) {
    return null;
  }

  const dogIds = sortedUniqueCanonicalIds(snapshot.dogIds);
  const assessmentIds = sortedUniqueCanonicalIds(snapshot.assessmentIds);
  const factorScoreIds = sortedUniqueCanonicalIds(snapshot.factorScoreIds);
  if (!dogIds || !assessmentIds || !factorScoreIds) return null;
  if (snapshot.scope === 'DOG' && dogIds.length !== 1) return null;

  return {
    schemaVersion: 'emopet-erasure-verification-snapshot-v1',
    scope: snapshot.scope,
    accountId: snapshot.accountId,
    dogIds,
    assessmentIds,
    factorScoreIds,
  };
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

async function countIn(
  tx: any,
  table: any,
  column: any,
  values: string[],
): Promise<number> {
  if (values.length === 0) return 0;
  return countWhere(tx, table, inArray(column, values));
}

function probe(key: string, count: number): ErasureSqlProbe {
  return { key, count };
}

/**
 * Capture the immutable identifiers required by the negative-residue contract
 * before any future destructive mutation destroys traversal paths.
 *
 * Read-only authority only: no DELETE/UPDATE/anonymisation/provider action.
 */
export async function captureErasureVerificationSnapshot(
  userId: string,
  requestedDogId?: string,
): Promise<ErasureSnapshotResult> {
  if (!isCanonicalSubjectUuid(userId)) return { ok: false, error: 'invalid_user_id' };
  if (requestedDogId !== undefined && !isCanonicalSubjectUuid(requestedDogId)) {
    return { ok: false, error: 'invalid_dog_id' };
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await tx.execute(sql`SET TRANSACTION READ ONLY`);
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [userRow] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('share')
        .limit(1);

      if (!userRow) return { ok: false, error: 'user_not_found' } as const;

      const ownedDogs = await tx
        .select({ id: dogs.id })
        .from(dogs)
        .where(eq(dogs.ownerId, userId))
        .for('share');

      const ownedDogIds = ownedDogs.map((row) => row.id).sort();
      if (requestedDogId !== undefined && !ownedDogIds.includes(requestedDogId)) {
        return { ok: false, error: 'dog_not_found' } as const;
      }

      const dogIds = requestedDogId === undefined ? ownedDogIds : [requestedDogId];

      const assessmentRows = dogIds.length === 0
        ? []
        : await tx
          .select({ id: behavioralAssessments.id })
          .from(behavioralAssessments)
          .where(inArray(behavioralAssessments.dogId, dogIds));

      const assessmentIds = assessmentRows.map((row) => row.id).sort();

      const factorRows = assessmentIds.length === 0
        ? []
        : await tx
          .select({ id: behavioralFactorScores.id })
          .from(behavioralFactorScores)
          .where(inArray(behavioralFactorScores.assessmentId, assessmentIds));

      const factorScoreIds = factorRows.map((row) => row.id).sort();

      return {
        ok: true,
        snapshot: {
          schemaVersion: 'emopet-erasure-verification-snapshot-v1',
          scope: requestedDogId === undefined ? 'ACCOUNT' : 'DOG',
          accountId: userId,
          dogIds,
          assessmentIds,
          factorScoreIds,
        },
      } as const;
    });
  } catch {
    return {
      ok: false,
      error: 'database_unavailable',
      retryable: true,
    };
  }
}

/**
 * Verify PostgreSQL residue using only pre-captured identifiers.
 *
 * This remains useful after a future executor removes parent rows because it
 * never needs to rediscover traversal paths through those parents.
 *
 * A SQL-clear result is intentionally NOT complete-erasure evidence: the five
 * non-SQL surfaces remain UNVERIFIED until independent probes exist.
 */
export async function verifyErasureResidue(
  rawSnapshot: ErasureVerificationSnapshot,
): Promise<ErasureResidueResult> {
  const snapshot = validSnapshot(rawSnapshot);
  if (!snapshot) {
    return {
      ok: false,
      mode: 'VERIFY_ONLY',
      destructiveActionAuthorized: false,
      claimsCompleteErasure: false,
      error: 'invalid_snapshot',
    };
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      await tx.execute(sql`SET TRANSACTION READ ONLY`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const rootProbes: ErasureSqlProbe[] = [];
      if (snapshot.scope === 'ACCOUNT') {
        rootProbes.push(probe(
          'users.id',
          await countWhere(tx, users, eq(users.id, snapshot.accountId)),
        ));
      }
      rootProbes.push(probe(
        'dogs.id',
        await countIn(tx, dogs, dogs.id, snapshot.dogIds),
      ));

      const accountRelationProbes: ErasureSqlProbe[] = [];
      if (snapshot.scope === 'ACCOUNT') {
        accountRelationProbes.push(
          probe('achievements.user_id', await countWhere(tx, achievements, eq(achievements.userId, snapshot.accountId))),
          probe('ai_messages.target_user_id', await countWhere(tx, aiMessages, eq(aiMessages.targetUserId, snapshot.accountId))),
          probe('auth_refresh_sessions.user_id', await countWhere(tx, authRefreshSessions, eq(authRefreshSessions.userId, snapshot.accountId))),
          probe('behavioral_assessments.respondent_user_id', await countWhere(tx, behavioralAssessments, eq(behavioralAssessments.respondentUserId, snapshot.accountId))),
          probe('comments.author_id', await countWhere(tx, comments, eq(comments.authorId, snapshot.accountId))),
          probe('communities.created_by', await countWhere(tx, communities, eq(communities.createdBy, snapshot.accountId))),
          probe('community_events.created_by', await countWhere(tx, communityEvents, eq(communityEvents.createdBy, snapshot.accountId))),
          probe('community_members.user_id', await countWhere(tx, communityMembers, eq(communityMembers.userId, snapshot.accountId))),
          probe('community_reports.reporter_user_id', await countWhere(tx, communityReports, eq(communityReports.reporterUserId, snapshot.accountId))),
          probe('community_rules_acceptances.user_id', await countWhere(tx, communityRulesAcceptances, eq(communityRulesAcceptances.userId, snapshot.accountId))),
          probe('dogs.owner_id', await countWhere(tx, dogs, eq(dogs.ownerId, snapshot.accountId))),
          probe('posts.author_id', await countWhere(tx, posts, eq(posts.authorId, snapshot.accountId))),
          probe('research_data_consents.user_id', await countWhere(tx, researchDataConsents, eq(researchDataConsents.userId, snapshot.accountId))),
          probe('subscriptions.user_id', await countWhere(tx, subscriptions, eq(subscriptions.userId, snapshot.accountId))),
          probe('user_config.user_id', await countWhere(tx, userConfig, eq(userConfig.userId, snapshot.accountId))),
        );
      }

      const dogRelationProbes: ErasureSqlProbe[] = [
        probe('ai_messages.dog_id', await countIn(tx, aiMessages, aiMessages.dogId, snapshot.dogIds)),
        probe('anticipation_events.dog_id', await countIn(tx, anticipationEvents, anticipationEvents.dogId, snapshot.dogIds)),
        probe('baseline_drift_monitor.dog_id', await countIn(tx, baselineDriftMonitor, baselineDriftMonitor.dogId, snapshot.dogIds)),
        probe('baselines.dog_id', await countIn(tx, baselines, baselines.dogId, snapshot.dogIds)),
        probe('behavioral_assessments.dog_id', await countIn(tx, behavioralAssessments, behavioralAssessments.dogId, snapshot.dogIds)),
        probe('devices.dog_id', await countIn(tx, devices, devices.dogId, snapshot.dogIds)),
        probe('dog_sub_baselines.dog_id', await countIn(tx, dogSubBaselines, dogSubBaselines.dogId, snapshot.dogIds)),
        probe('eli_behavioral_priors.dog_id', await countIn(tx, eliBehavioralPriors, eliBehavioralPriors.dogId, snapshot.dogIds)),
        probe('eli_states.dog_id', await countIn(tx, eliStates, eliStates.dogId, snapshot.dogIds)),
        probe('health_entries.dog_id', await countIn(tx, healthEntries, healthEntries.dogId, snapshot.dogIds)),
        probe('recovery_events.dog_id', await countIn(tx, recoveryEvents, recoveryEvents.dogId, snapshot.dogIds)),
        probe('research_data_consents.dog_id', await countIn(tx, researchDataConsents, researchDataConsents.dogId, snapshot.dogIds)),
        probe('routine_stability.dog_id', await countIn(tx, routineStability, routineStability.dogId, snapshot.dogIds)),
        probe('sensor_summaries.dog_id', await countIn(tx, sensorSummaries, sensorSummaries.dogId, snapshot.dogIds)),
        probe('user_config.dog_id', await countIn(tx, userConfig, userConfig.dogId, snapshot.dogIds)),
        probe('walk_quality.dog_id', await countIn(tx, walkQuality, walkQuality.dogId, snapshot.dogIds)),
        probe(
          'copresence_events.dog_a_id',
          snapshot.dogIds.length === 0
            ? 0
            : await countWhere(tx, copresenceEvents, inArray(copresenceEvents.dogAId, snapshot.dogIds)),
        ),
        probe(
          'copresence_events.dog_b_id',
          snapshot.dogIds.length === 0
            ? 0
            : await countWhere(tx, copresenceEvents, inArray(copresenceEvents.dogBId, snapshot.dogIds)),
        ),
      ];

      const transitiveRelationProbes: ErasureSqlProbe[] = [
        probe(
          'behavioral_responses.assessment_id',
          await countIn(tx, behavioralResponses, behavioralResponses.assessmentId, snapshot.assessmentIds),
        ),
        probe(
          'behavioral_factor_scores.assessment_id',
          await countIn(tx, behavioralFactorScores, behavioralFactorScores.assessmentId, snapshot.assessmentIds),
        ),
        probe(
          'eli_behavioral_priors.assessment_id',
          await countIn(tx, eliBehavioralPriors, eliBehavioralPriors.assessmentId, snapshot.assessmentIds),
        ),
        probe(
          'eli_behavioral_priors.factor_score_id',
          await countIn(tx, eliBehavioralPriors, eliBehavioralPriors.factorScoreId, snapshot.factorScoreIds),
        ),
      ];

      const sqlProbes = [
        ...rootProbes,
        ...accountRelationProbes,
        ...dogRelationProbes,
        ...transitiveRelationProbes,
      ];
      const nonZeroSqlProbeCount = sqlProbes.filter((item) => item.count > 0).length;

      return {
        ok: true,
        mode: 'VERIFY_ONLY',
        destructiveActionAuthorized: false,
        claimsCompleteErasure: false,
        snapshot,
        status: nonZeroSqlProbeCount > 0
          ? 'SQL_RESIDUE_PRESENT'
          : 'SQL_CLEAR_NON_SQL_UNVERIFIED',
        rootProbes,
        accountRelationProbes,
        dogRelationProbes,
        transitiveRelationProbes,
        nonSqlProbes: NON_SQL_SURFACES.map((surface) => ({
          surface,
          status: 'UNVERIFIED' as const,
        })),
        nonZeroSqlProbeCount,
      } as const;
    });
  } catch {
    return {
      ok: false,
      mode: 'VERIFY_ONLY',
      destructiveActionAuthorized: false,
      claimsCompleteErasure: false,
      error: 'database_unavailable',
      retryable: true,
    };
  }
}
