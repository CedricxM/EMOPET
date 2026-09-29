import { and, asc, eq, exists, gt, isNull, sql } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import { authRefreshSessions, users, worldPilotAccess } from '../../db/schema/index.js';
import { revokeActor } from './actor-revocation.js';

/**
 * Canonical World pilot access (WORLD-SOCIAL-03 / #596, decisions #48 L1 + L7).
 *
 * Eligible = the account exists, holds an unrevoked pilot grant, and still has a
 * live login (an unrevoked, unexpired refresh session). The last condition closes
 * the window in which an access JWT outlives logout_all. Account status and
 * suspension do not exist in the canonical model yet (#596 decision record).
 */
export interface WorldPilotAccessRepository {
  isEligible(userId: string, now?: Date): Promise<boolean>;
  /** Invitation by an operator, after the tester declared being an adult. Idempotent; re-grants a revoked row. */
  grant(userId: string, adultSelfDeclaredAt: Date, now?: Date): Promise<'granted' | 'user_not_found'>;
  /** Revokes and closes the actor's live World sessions in this process. */
  revoke(userId: string, now?: Date): Promise<boolean>;
  listActive(): Promise<Array<{ userId: string; grantedAt: Date }>>;
}

export class WorldPilotAccessError extends Error {
  constructor(public code: 'adult_declaration_required') { super(code); }
}

export function drizzleWorldPilotAccess(database: Database = db): WorldPilotAccessRepository {
  return {
    async isEligible(userId, now = new Date()) {
      const [row] = await database.select({ userId: worldPilotAccess.userId })
        .from(worldPilotAccess)
        .innerJoin(users, eq(users.id, worldPilotAccess.userId))
        .where(and(
          eq(worldPilotAccess.userId, userId),
          isNull(worldPilotAccess.revokedAt),
          exists(database.select({ one: sql`1` }).from(authRefreshSessions).where(and(
            eq(authRefreshSessions.userId, worldPilotAccess.userId),
            isNull(authRefreshSessions.revokedAt),
            gt(authRefreshSessions.expiresAt, now),
          ))),
        ))
        .limit(1);
      return Boolean(row);
    },
    async grant(userId, adultSelfDeclaredAt, now = new Date()) {
      if (!(adultSelfDeclaredAt instanceof Date) || Number.isNaN(adultSelfDeclaredAt.getTime()) || adultSelfDeclaredAt > now) {
        throw new WorldPilotAccessError('adult_declaration_required');
      }
      const [user] = await database.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return 'user_not_found';
      await database.insert(worldPilotAccess)
        .values({ userId, adultSelfDeclaredAt, grantedAt: now })
        .onConflictDoUpdate({
          target: worldPilotAccess.userId,
          set: { adultSelfDeclaredAt, grantedAt: now, revokedAt: null },
        });
      return 'granted';
    },
    async revoke(userId, now = new Date()) {
      const revoked = await database.update(worldPilotAccess)
        .set({ revokedAt: now })
        .where(and(eq(worldPilotAccess.userId, userId), isNull(worldPilotAccess.revokedAt)))
        .returning({ userId: worldPilotAccess.userId });
      // Close live sessions even if the row was already revoked by another path.
      await revokeActor(userId, 'world_access_revoked');
      return revoked.length > 0;
    },
    async listActive() {
      return database.select({ userId: worldPilotAccess.userId, grantedAt: worldPilotAccess.grantedAt })
        .from(worldPilotAccess)
        .where(isNull(worldPilotAccess.revokedAt))
        .orderBy(asc(worldPilotAccess.grantedAt));
    },
  };
}
