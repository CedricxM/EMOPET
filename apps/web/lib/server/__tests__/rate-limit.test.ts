import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFixedWindowRateLimiter } from '../rate-limit';

test('fixed window limiter accepts requests until the quota is reached', () => {
  const limiter = createFixedWindowRateLimiter({ limit: 2, windowMs: 1_000 });

  assert.deepEqual(limiter.check('client-a', 1_000), {
    ok: true,
    limit: 2,
    remaining: 1,
    resetAt: 2_000,
  });
  assert.deepEqual(limiter.check('client-a', 1_100), {
    ok: true,
    limit: 2,
    remaining: 0,
    resetAt: 2_000,
  });
  assert.deepEqual(limiter.check('client-a', 1_200), {
    ok: false,
    limit: 2,
    remaining: 0,
    resetAt: 2_000,
  });
});

test('fixed window limiter resets after the window expires', () => {
  const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 500 });

  assert.equal(limiter.check('client-a', 1_000).ok, true);
  assert.equal(limiter.check('client-a', 1_100).ok, false);
  const reopened = limiter.check('client-a', 1_500);
  assert.equal(reopened.ok, true);
  assert.equal(reopened.remaining, 0);
  assert.equal(reopened.resetAt, 2_000);
});

test('fixed window limiter isolates different keys', () => {
  const limiter = createFixedWindowRateLimiter({ limit: 1, windowMs: 1_000 });

  assert.equal(limiter.check('client-a', 1_000).ok, true);
  assert.equal(limiter.check('client-a', 1_100).ok, false);
  assert.equal(limiter.check('client-b', 1_100).ok, true);
});
