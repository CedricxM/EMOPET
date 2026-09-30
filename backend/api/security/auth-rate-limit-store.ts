import { createHmac } from 'node:crypto';

import { lte, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { authRateLimitWindows } from '../../db/schema/index.js';

const AUTH_RATE_LIMIT_HMAC_DOMAIN = 'emopet-auth-rate-limit-v1';
const TEST_ONLY_HMAC_SECRET =
  'emopet-test-only-auth-rate-limit-hmac-secret-do-not-use-outside-tests';

export interface SharedAuthRateLimitOptions {
  limit: number;
  windowMs: number;
}

export type SharedAuthRateLimitResult =
  | {
      status: 'ALLOWED' | 'RATE_LIMITED';
      limit: number;
      remaining: number;
      resetAt: number;
    }
  | {
      status: 'STORE_UNAVAILABLE';
      retryable: true;
    };

function validOptions(options: SharedAuthRateLimitOptions): boolean {
  return Number.isSafeInteger(options.limit)
    && options.limit >= 1
    && options.limit <= 1000
    && Number.isSafeInteger(options.windowMs)
    && options.windowMs >= 1000
    && options.windowMs <= 86_400_000;
}

function resolveAuthRateLimitHmacSecret(): string {
  const configured = process.env['AUTH_RATE_LIMIT_HMAC_SECRET']?.trim();

  if (process.env['NODE_ENV'] === 'test' && !configured) {
    return TEST_ONLY_HMAC_SECRET;
  }

  if (
    !configured
    || configured.length < 32
    || configured.startsWith('replace-with-')
    || configured === 'dev-secret-change-in-production'
  ) {
    throw new Error(
      'AUTH_RATE_LIMIT_HMAC_SECRET must be configured with at least 32 characters',
    );
  }

  return configured;
}

export function assertAuthRateLimitRuntimeConfiguration(): void {
  const secret = resolveAuthRateLimitHmacSecret();
  const jwtSecret = process.env['JWT_SECRET']?.trim();

  if (jwtSecret && secret === jwtSecret) {
    throw new Error(
      'AUTH_RATE_LIMIT_HMAC_SECRET must be distinct from JWT_SECRET',
    );
  }
}

export function hashAuthRateLimitBucketKey(rawKey: string): string {
  const normalized = rawKey.trim();
  if (!normalized || normalized.length > 256) {
    throw new Error('Invalid auth rate-limit bucket key');
  }

  return createHmac('sha256', resolveAuthRateLimitHmacSecret())
    .update(AUTH_RATE_LIMIT_HMAC_DOMAIN)
    .update('\0')
    .update(normalized)
    .digest('hex');
}

/**
 * Opportunistic bounded cleanup. A deployment may add a scheduler later, but
 * every auth check already removes expired rows using the reset_at index.
 */
export async function purgeExpiredAuthRateLimitWindows(): Promise<boolean> {
  try {
    await db
      .delete(authRateLimitWindows)
      .where(lte(authRateLimitWindows.resetAt, sql`CURRENT_TIMESTAMP`));
    return true;
  } catch {
    return false;
  }
}

/**
 * Shared fixed-window check using one PostgreSQL upsert.
 *
 * The database clock is authoritative for window boundaries. Count saturates at
 * limit+1 so repeated blocked traffic cannot grow the counter without bound.
 */
export async function checkSharedAuthRateLimit(
  rawKey: string,
  options: SharedAuthRateLimitOptions,
): Promise<SharedAuthRateLimitResult> {
  if (!validOptions(options)) {
    return { status: 'STORE_UNAVAILABLE', retryable: true };
  }

  let bucketHash: string;
  try {
    bucketHash = hashAuthRateLimitBucketKey(rawKey);
  } catch {
    return { status: 'STORE_UNAVAILABLE', retryable: true };
  }

  try {
    await db
      .delete(authRateLimitWindows)
      .where(lte(authRateLimitWindows.resetAt, sql`CURRENT_TIMESTAMP`));

    const [row] = await db
      .insert(authRateLimitWindows)
      .values({
        bucketHash,
        count: 1,
        windowStartedAt: sql`CURRENT_TIMESTAMP`,
        resetAt: sql`CURRENT_TIMESTAMP + (${options.windowMs} * INTERVAL '1 millisecond')`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .onConflictDoUpdate({
        target: authRateLimitWindows.bucketHash,
        set: {
          count: sql`CASE
            WHEN ${authRateLimitWindows.resetAt} <= CURRENT_TIMESTAMP THEN 1
            ELSE LEAST(${authRateLimitWindows.count} + 1, ${options.limit + 1})
          END`,
          windowStartedAt: sql`CASE
            WHEN ${authRateLimitWindows.resetAt} <= CURRENT_TIMESTAMP
              THEN CURRENT_TIMESTAMP
            ELSE ${authRateLimitWindows.windowStartedAt}
          END`,
          resetAt: sql`CASE
            WHEN ${authRateLimitWindows.resetAt} <= CURRENT_TIMESTAMP
              THEN CURRENT_TIMESTAMP + (${options.windowMs} * INTERVAL '1 millisecond')
            ELSE ${authRateLimitWindows.resetAt}
          END`,
          // CURRENT_TIMESTAMP is transaction-scoped in PostgreSQL. A losing
          // concurrent UPSERT may have started slightly before the transaction
          // that inserted the current window, then resume after that winner
          // commits. Never let its older transaction timestamp move updated_at
          // behind the already-authoritative window_started_at.
          updatedAt: sql`GREATEST(CURRENT_TIMESTAMP, ${authRateLimitWindows.windowStartedAt})`,
        },
      })
      .returning({
        count: authRateLimitWindows.count,
        resetAt: authRateLimitWindows.resetAt,
      });

    if (!row) {
      return { status: 'STORE_UNAVAILABLE', retryable: true };
    }

    const allowed = row.count <= options.limit;
    return {
      status: allowed ? 'ALLOWED' : 'RATE_LIMITED',
      limit: options.limit,
      remaining: allowed ? Math.max(0, options.limit - row.count) : 0,
      resetAt: row.resetAt.getTime(),
    };
  } catch {
    return { status: 'STORE_UNAVAILABLE', retryable: true };
  }
}
