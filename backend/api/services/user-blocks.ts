import { and, desc, eq, or } from 'drizzle-orm';

import { db, type Database } from '../../db/index.js';
import { userBlocks, users } from '../../db/schema/index.js';

/**
 * Where a stored block currently has a runtime effect. Kept explicit so no client
 * can read "blocked" as "hidden everywhere" before each surface enforces it.
 */
export const BLOCK_ENFORCEMENT = {
  // Community feed, events and comment creation hide people blocked either way.
  community: 'ENFORCED',
  world: 'NOT_ENFORCED',
} as const;

export const MAX_LISTED_BLOCKS = 500;

export type CreateBlockResult = 'created' | 'exists' | 'target_not_found';

export interface UserBlockRecord {
  blockedUserId: string;
  createdAt: Date;
}

export interface UserBlockRepository {
  create(blockerUserId: string, blockedUserId: string): Promise<{ result: CreateBlockResult; block?: UserBlockRecord }>;
  remove(blockerUserId: string, blockedUserId: string): Promise<void>;
  list(blockerUserId: string): Promise<UserBlockRecord[]>;
  /** True when either person blocked the other. Enforcement points use this. */
  isBlockedEitherWay(userA: string, userB: string): Promise<boolean>;
}

const FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    if ((current as { code?: unknown }).code === FOREIGN_KEY_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export function drizzleUserBlockRepository(database: Database = db): UserBlockRepository {
  const record = { blockedUserId: userBlocks.blockedUserId, createdAt: userBlocks.createdAt };
  return {
    async create(blockerUserId, blockedUserId) {
      const [target] = await database.select({ id: users.id }).from(users)
        .where(eq(users.id, blockedUserId)).limit(1);
      if (!target) return { result: 'target_not_found' };
      try {
        const [created] = await database.insert(userBlocks)
          .values({ blockerUserId, blockedUserId })
          .onConflictDoNothing({ target: [userBlocks.blockerUserId, userBlocks.blockedUserId] })
          .returning(record);
        if (created) return { result: 'created', block: created };
      } catch (error) {
        // The target account can disappear between the lookup and the insert.
        if (isForeignKeyViolation(error)) return { result: 'target_not_found' };
        throw error;
      }
      const [existing] = await database.select(record).from(userBlocks)
        .where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId)))
        .limit(1);
      return existing ? { result: 'exists', block: existing } : { result: 'target_not_found' };
    },
    async remove(blockerUserId, blockedUserId) {
      await database.delete(userBlocks)
        .where(and(eq(userBlocks.blockerUserId, blockerUserId), eq(userBlocks.blockedUserId, blockedUserId)));
    },
    async list(blockerUserId) {
      return database.select(record).from(userBlocks)
        .where(eq(userBlocks.blockerUserId, blockerUserId))
        .orderBy(desc(userBlocks.createdAt))
        .limit(MAX_LISTED_BLOCKS);
    },
    async isBlockedEitherWay(userA, userB) {
      const [row] = await database.select({ id: userBlocks.id }).from(userBlocks)
        .where(or(
          and(eq(userBlocks.blockerUserId, userA), eq(userBlocks.blockedUserId, userB)),
          and(eq(userBlocks.blockerUserId, userB), eq(userBlocks.blockedUserId, userA)),
        ))
        .limit(1);
      return Boolean(row);
    },
  };
}
