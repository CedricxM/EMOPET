import { and, eq, inArray, isNull, gt, or } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import { socialConnections, userBlocks, users, worldPresenceConsents } from '../../db/schema/index.js';

/**
 * Canonical social connections (WORLD-SOCIAL-02 / #595, #46 trust ladder, decision #48 L3).
 * Transitions decided 2026-09-28 (#595 issuecomment-5866924308):
 *
 * - CONNECTED by request + acceptance. A mutual request connects at once.
 * - A decline is silent: the declined person keeps seeing a pending request and cannot ask
 *   again; only the person who declined can reopen by asking in turn.
 * - Either person removes a connection in one action, without penalty (no decline memory).
 * - TRUSTED is directional, user-granted and requires CONNECTED; the other person never
 *   learns whether they are trusted.
 * - BLOCKED overrides every state, and a block dissolves pending and connected rows
 *   (unblocking restores nothing). A person blocked either way looks like an unknown user.
 * - CONTEXTUAL_ACQUAINTANCE exists but nothing produces it yet (no shared activity exists).
 *
 * States gate actions only: there is no score and no automatic upgrade.
 */
export type TrustState = 'STRANGER' | 'CONTEXTUAL_ACQUAINTANCE' | 'CONNECTED' | 'TRUSTED' | 'BLOCKED';

export const MAX_LISTED_CONNECTIONS = 500;

export interface ConnectionListing {
  connections: Array<{ userId: string; state: 'CONNECTED' | 'TRUSTED'; connectedAt: Date }>;
  incoming: Array<{ userId: string; requestedAt: Date }>;
  outgoing: Array<{ userId: string; requestedAt: Date }>;
}

export interface SocialConnectionRepository {
  request(actor: string, target: string): Promise<'pending' | 'connected' | 'target_not_found'>;
  accept(actor: string, requester: string): Promise<'connected' | 'not_found'>;
  /** Silent: the requester is never told. */
  decline(actor: string, requester: string): Promise<void>;
  /** Withdraws the actor's own pending request; never erases a decline. */
  cancel(actor: string, target: string): Promise<void>;
  remove(actor: string, other: string): Promise<void>;
  setTrust(actor: string, other: string, trusted: boolean): Promise<'ok' | 'not_connected'>;
  list(actor: string): Promise<ConnectionListing>;
  trustState(viewer: string, other: string): Promise<TrustState>;
  /** CONNECTED (or TRUSTED either way) and not blocked either way. */
  isMutuallyConnected(a: string, b: string): Promise<boolean>;
  connectedPeers(actor: string): Promise<string[]>;
}

export interface WorldPresenceConsentRepository {
  /** Opt-in for one World session; `expiresAt` is capped at 24 hours. */
  grant(userId: string, expiresAt: Date, now?: Date): Promise<void>;
  withdraw(userId: string, now?: Date): Promise<void>;
  isActive(userId: string, now?: Date): Promise<boolean>;
}

export class SocialConnectionError extends Error {
  constructor(public code: 'invalid_request') { super(code); }
}

const MAX_CONSENT_MS = 24 * 60 * 60 * 1000;

/** Unordered pair in the order PostgreSQL compares UUIDs (lowercase hex order). */
export function orderedPair(a: string, b: string) {
  const x = a.toLowerCase(); const y = b.toLowerCase();
  if (x === y) throw new SocialConnectionError('invalid_request');
  return x < y ? { low: x, high: y, aIsLow: true } : { low: y, high: x, aIsLow: false };
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export function drizzleSocialConnectionRepository(database: Database = db): SocialConnectionRepository {
  const pairWhere = (low: string, high: string) => and(eq(socialConnections.userLowId, low), eq(socialConnections.userHighId, high));
  const blockedEitherWay = async (tx: Tx | Database, a: string, b: string) => {
    const [row] = await tx.select({ id: userBlocks.id }).from(userBlocks).where(or(
      and(eq(userBlocks.blockerUserId, a), eq(userBlocks.blockedUserId, b)),
      and(eq(userBlocks.blockerUserId, b), eq(userBlocks.blockedUserId, a)),
    )).limit(1);
    return Boolean(row);
  };
  const locked = async (tx: Tx, low: string, high: string) => {
    const [row] = await tx.select().from(socialConnections).where(pairWhere(low, high)).limit(1).for('update');
    return row;
  };

  const repository: SocialConnectionRepository = {
    async request(actor, target) {
      const { low, high, aIsLow } = orderedPair(actor, target);
      return database.transaction(async (tx) => {
        const [exists] = await tx.select({ id: users.id }).from(users).where(eq(users.id, target.toLowerCase())).limit(1);
        if (!exists || await blockedEitherWay(tx, actor.toLowerCase(), target.toLowerCase())) return 'target_not_found' as const;
        let row = await locked(tx, low, high);
        if (!row) {
          const inserted = await tx.insert(socialConnections)
            .values({ userLowId: low, userHighId: high, status: 'PENDING', requestedByLow: aIsLow })
            .onConflictDoNothing({ target: [socialConnections.userLowId, socialConnections.userHighId] })
            .returning({ id: socialConnections.id });
          if (inserted.length) return 'pending' as const;
          row = await locked(tx, low, high);
          if (!row) return 'pending' as const;
        }
        const actorRequested = row.requestedByLow === aIsLow;
        if (row.status === 'CONNECTED') return 'connected' as const;
        if (row.status === 'PENDING' && actorRequested) return 'pending' as const;
        const now = new Date();
        if (row.status === 'PENDING') {
          // The other person already asked: a mutual request connects.
          await tx.update(socialConnections).set({ status: 'CONNECTED', connectedAt: now, updatedAt: now }).where(pairWhere(low, high));
          return 'connected' as const;
        }
        // DECLINED. The declined person cannot ask again and is not told; the decliner may reopen.
        if (actorRequested) return 'pending' as const;
        await tx.update(socialConnections).set({ status: 'PENDING', requestedByLow: aIsLow, updatedAt: now }).where(pairWhere(low, high));
        return 'pending' as const;
      });
    },
    async accept(actor, requester) {
      const { low, high, aIsLow } = orderedPair(actor, requester);
      return database.transaction(async (tx) => {
        const row = await locked(tx, low, high);
        if (!row || row.status !== 'PENDING' || row.requestedByLow === aIsLow) return 'not_found' as const;
        if (await blockedEitherWay(tx, actor.toLowerCase(), requester.toLowerCase())) return 'not_found' as const;
        const now = new Date();
        await tx.update(socialConnections).set({ status: 'CONNECTED', connectedAt: now, updatedAt: now }).where(pairWhere(low, high));
        return 'connected' as const;
      });
    },
    async decline(actor, requester) {
      const { low, high, aIsLow } = orderedPair(actor, requester);
      await database.update(socialConnections).set({ status: 'DECLINED', updatedAt: new Date() })
        .where(and(pairWhere(low, high), eq(socialConnections.status, 'PENDING'), eq(socialConnections.requestedByLow, !aIsLow)));
    },
    async cancel(actor, target) {
      const { low, high, aIsLow } = orderedPair(actor, target);
      await database.delete(socialConnections)
        .where(and(pairWhere(low, high), eq(socialConnections.status, 'PENDING'), eq(socialConnections.requestedByLow, aIsLow)));
    },
    async remove(actor, other) {
      const { low, high } = orderedPair(actor, other);
      await database.delete(socialConnections).where(and(pairWhere(low, high), eq(socialConnections.status, 'CONNECTED')));
    },
    async setTrust(actor, other, trusted) {
      const { low, high, aIsLow } = orderedPair(actor, other);
      const updated = await database.update(socialConnections)
        .set(aIsLow ? { lowTrustsHigh: trusted, updatedAt: new Date() } : { highTrustsLow: trusted, updatedAt: new Date() })
        .where(and(pairWhere(low, high), eq(socialConnections.status, 'CONNECTED')))
        .returning({ id: socialConnections.id });
      return updated.length ? 'ok' : 'not_connected';
    },
    async list(actor) {
      const me = actor.toLowerCase();
      const rows = await database.select().from(socialConnections)
        .where(and(
          or(eq(socialConnections.userLowId, me), eq(socialConnections.userHighId, me)),
          inArray(socialConnections.status, ['PENDING', 'CONNECTED', 'DECLINED']),
        ))
        .limit(MAX_LISTED_CONNECTIONS);
      const listing: ConnectionListing = { connections: [], incoming: [], outgoing: [] };
      for (const row of rows) {
        const meIsLow = row.userLowId === me;
        const other = meIsLow ? row.userHighId : row.userLowId;
        const iRequested = row.requestedByLow === meIsLow;
        if (row.status === 'CONNECTED') {
          const iTrust = meIsLow ? row.lowTrustsHigh : row.highTrustsLow;
          listing.connections.push({ userId: other, state: iTrust ? 'TRUSTED' : 'CONNECTED', connectedAt: row.connectedAt! });
        } else if (iRequested) {
          // A decline stays silent: the requester keeps seeing a pending request.
          listing.outgoing.push({ userId: other, requestedAt: row.createdAt });
        } else if (row.status === 'PENDING') {
          listing.incoming.push({ userId: other, requestedAt: row.updatedAt });
        }
      }
      return listing;
    },
    async trustState(viewer, other) {
      const { low, high, aIsLow } = orderedPair(viewer, other);
      if (await blockedEitherWay(database, viewer.toLowerCase(), other.toLowerCase())) return 'BLOCKED';
      const [row] = await database.select().from(socialConnections).where(pairWhere(low, high)).limit(1);
      if (row?.status !== 'CONNECTED') return 'STRANGER';
      return (aIsLow ? row.lowTrustsHigh : row.highTrustsLow) ? 'TRUSTED' : 'CONNECTED';
    },
    async isMutuallyConnected(a, b) {
      const state = await repository.trustState(a, b);
      return state === 'CONNECTED' || state === 'TRUSTED';
    },
    async connectedPeers(actor) {
      return (await repository.list(actor)).connections.map((connection) => connection.userId);
    },
  };
  return repository;
}

export function drizzleWorldPresenceConsentRepository(database: Database = db): WorldPresenceConsentRepository {
  return {
    async grant(userId, expiresAt, now = new Date()) {
      if (!(expiresAt instanceof Date) || !(expiresAt > now)) throw new SocialConnectionError('invalid_request');
      const capped = new Date(Math.min(expiresAt.getTime(), now.getTime() + MAX_CONSENT_MS));
      await database.insert(worldPresenceConsents)
        .values({ userId, grantedAt: now, expiresAt: capped })
        .onConflictDoUpdate({ target: worldPresenceConsents.userId, set: { grantedAt: now, expiresAt: capped, withdrawnAt: null } });
    },
    async withdraw(userId, now = new Date()) {
      await database.update(worldPresenceConsents).set({ withdrawnAt: now })
        .where(and(eq(worldPresenceConsents.userId, userId), isNull(worldPresenceConsents.withdrawnAt)));
    },
    async isActive(userId, now = new Date()) {
      const [row] = await database.select({ userId: worldPresenceConsents.userId }).from(worldPresenceConsents)
        .where(and(eq(worldPresenceConsents.userId, userId), isNull(worldPresenceConsents.withdrawnAt), gt(worldPresenceConsents.expiresAt, now)))
        .limit(1);
      return Boolean(row);
    },
  };
}
