export interface FixedWindowRateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createFixedWindowRateLimiter({ limit, windowMs }: FixedWindowRateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function check(key: string, now = Date.now()): RateLimitResult {
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

  function reset(key?: string): void {
    if (key) buckets.delete(key);
    else buckets.clear();
  }

  return { check, reset };
}
