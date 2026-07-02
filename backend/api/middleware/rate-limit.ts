import { createMiddleware } from 'hono/factory';

export interface FixedWindowRateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createFixedWindowLimiter({ limit, windowMs }: FixedWindowRateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function check(key: string, now = Date.now()) {
    const safeKey = key.trim() || 'anonymous';
    const existing = buckets.get(safeKey);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(safeKey, { count: 1, resetAt });
      return { ok: true, limit, remaining: Math.max(0, limit - 1), resetAt };
    }

    if (existing.count >= limit) {
      return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { ok: true, limit, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
  }

  return { check, reset: () => buckets.clear() };
}

function trustedProxyHeadersEnabled(): boolean {
  return process.env['EMOPET_TRUST_PROXY_HEADERS'] === 'true';
}

function safeKeySegment(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^a-zA-Z0-9:._-]/g, '_')
    .slice(0, 96)
    .trim() || 'local';
}

export function rateLimitMiddleware(options: FixedWindowRateLimitOptions) {
  const limiter = createFixedWindowLimiter(options);
  const prefix = options.keyPrefix ?? 'api';

  return createMiddleware(async (c, next) => {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = trustedProxyHeadersEnabled()
      ? c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || forwarded || 'local'
      : 'local';
    const rate = limiter.check(`${prefix}:${safeKeySegment(ip)}`);
    if (!rate.ok) {
      return c.json(
        { error: 'rate_limited' },
        429,
        {
          'retry-after': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
          'x-ratelimit-limit': String(rate.limit),
          'x-ratelimit-remaining': String(rate.remaining),
          'x-ratelimit-reset': String(Math.ceil(rate.resetAt / 1000)),
        },
      );
    }
    await next();
  });
}
