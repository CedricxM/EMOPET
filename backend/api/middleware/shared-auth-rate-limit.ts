import { createMiddleware } from 'hono/factory';

import {
  checkSharedAuthRateLimit,
  type SharedAuthRateLimitOptions,
} from '../security/auth-rate-limit-store.js';
import { backendRateLimitClientKey } from './rate-limit.js';

export interface SharedAuthRateLimitMiddlewareOptions
  extends SharedAuthRateLimitOptions {
  keyPrefix?: string;
}

/**
 * PostgreSQL-backed auth limiter.
 *
 * Store/configuration failure fails closed with 503; it never falls back to a
 * per-process allowance that would silently multiply the auth budget.
 */
export function sharedAuthRateLimitMiddleware(
  options: SharedAuthRateLimitMiddlewareOptions,
) {
  const prefix = options.keyPrefix ?? 'auth';

  return createMiddleware(async (c, next) => {
    const result = await checkSharedAuthRateLimit(
      backendRateLimitClientKey(c, prefix),
      {
        limit: options.limit,
        windowMs: options.windowMs,
      },
    );

    if (result.status === 'STORE_UNAVAILABLE') {
      return c.json(
        { error: 'rate_limit_unavailable' },
        503,
        {
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
        },
      );
    }

    if (result.status === 'RATE_LIMITED') {
      return c.json(
        { error: 'rate_limited' },
        429,
        {
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff',
          'retry-after': String(
            Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
          ),
          'x-ratelimit-limit': String(result.limit),
          'x-ratelimit-remaining': String(result.remaining),
          'x-ratelimit-reset': String(Math.ceil(result.resetAt / 1000)),
        },
      );
    }

    await next();
  });
}
