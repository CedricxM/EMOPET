import { eq, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { authRefreshSessions, users } from '../../db/schema/index.js';

export interface AuthEmailLegacyRolloutCensusV1 {
  schemaVersion: 'auth-email-legacy-rollout-census-v1';
  generatedAt: string;
  users: {
    total: number;
    legacyUnverified: number;
    legacyVerified: number;
    verificationRequiredUnverified: number;
    verificationRequiredVerified: number;
    inconsistentVerifiedBeforeRequirement: number;
  };
  activeRefreshSessions: {
    total: number;
    detached: number;
    legacyUnverified: number;
    legacyVerified: number;
    verificationRequiredUnverified: number;
    verificationRequiredVerified: number;
  };
  authority: {
    mutationAuthorized: false;
    rolloutDecisionAuthorized: false;
  };
}

export async function collectAuthEmailLegacyRolloutCensus(
  clock: () => Date = () => new Date(),
): Promise<AuthEmailLegacyRolloutCensusV1> {
  const now = clock();

  const [userCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      legacyUnverified: sql<number>`count(*) FILTER (
        WHERE ${users.emailVerificationRequiredAt} IS NULL
          AND ${users.emailVerifiedAt} IS NULL
      )::int`,
      legacyVerified: sql<number>`count(*) FILTER (
        WHERE ${users.emailVerificationRequiredAt} IS NULL
          AND ${users.emailVerifiedAt} IS NOT NULL
      )::int`,
      verificationRequiredUnverified: sql<number>`count(*) FILTER (
        WHERE ${users.emailVerificationRequiredAt} IS NOT NULL
          AND ${users.emailVerifiedAt} IS NULL
      )::int`,
      verificationRequiredVerified: sql<number>`count(*) FILTER (
        WHERE ${users.emailVerificationRequiredAt} IS NOT NULL
          AND ${users.emailVerifiedAt} IS NOT NULL
      )::int`,
      inconsistentVerifiedBeforeRequirement: sql<number>`count(*) FILTER (
        WHERE ${users.emailVerificationRequiredAt} IS NOT NULL
          AND ${users.emailVerifiedAt} IS NOT NULL
          AND ${users.emailVerifiedAt} < ${users.emailVerificationRequiredAt}
      )::int`,
    })
    .from(users);

  const [sessionCounts] = await db
    .select({
      total: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
      )::int`,
      detached: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
          AND ${authRefreshSessions.userId} IS NULL
      )::int`,
      legacyUnverified: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
          AND ${users.emailVerificationRequiredAt} IS NULL
          AND ${users.emailVerifiedAt} IS NULL
      )::int`,
      legacyVerified: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
          AND ${users.emailVerificationRequiredAt} IS NULL
          AND ${users.emailVerifiedAt} IS NOT NULL
      )::int`,
      verificationRequiredUnverified: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
          AND ${users.emailVerificationRequiredAt} IS NOT NULL
          AND ${users.emailVerifiedAt} IS NULL
      )::int`,
      verificationRequiredVerified: sql<number>`count(*) FILTER (
        WHERE ${authRefreshSessions.revokedAt} IS NULL
          AND ${authRefreshSessions.expiresAt} > ${now}
          AND ${users.emailVerificationRequiredAt} IS NOT NULL
          AND ${users.emailVerifiedAt} IS NOT NULL
      )::int`,
    })
    .from(authRefreshSessions)
    .leftJoin(users, eq(authRefreshSessions.userId, users.id));

  const u = userCounts ?? {
    total: 0,
    legacyUnverified: 0,
    legacyVerified: 0,
    verificationRequiredUnverified: 0,
    verificationRequiredVerified: 0,
    inconsistentVerifiedBeforeRequirement: 0,
  };
  const s = sessionCounts ?? {
    total: 0,
    detached: 0,
    legacyUnverified: 0,
    legacyVerified: 0,
    verificationRequiredUnverified: 0,
    verificationRequiredVerified: 0,
  };

  return {
    schemaVersion: 'auth-email-legacy-rollout-census-v1',
    generatedAt: now.toISOString(),
    users: u,
    activeRefreshSessions: s,
    authority: {
      mutationAuthorized: false,
      rolloutDecisionAuthorized: false,
    },
  };
}
