import test from 'node:test';
import assert from 'node:assert/strict';

import { createDogOwnershipAuthorizer } from '../dist/api/middleware/authorization.js';
import { createFixedWindowLimiter } from '../dist/api/middleware/rate-limit.js';

const DOG_ID = '11111111-1111-4111-8111-111111111111';

test('dog ownership authorizer rejects cross-user dog access', async () => {
  const owners = new Map([[DOG_ID, 'user-a']]);
  const authorize = createDogOwnershipAuthorizer({
    async findDogOwnerId(dogId) {
      return owners.get(dogId) ?? null;
    },
  });

  assert.equal((await authorize('user-a', DOG_ID)).ok, true);

  const crossUser = await authorize('user-b', DOG_ID);
  assert.equal(crossUser.ok, false);
  assert.equal(crossUser.status, 404);
  assert.equal(crossUser.error, 'not_found');

  const missingUser = await authorize(null, DOG_ID);
  assert.equal(missingUser.ok, false);
  assert.equal(missingUser.status, 401);

  const invalidDogId = await authorize('user-a', 'not-a-uuid');
  assert.equal(invalidDogId.ok, false);
  assert.equal(invalidDogId.status, 400);
});

test('backend fixed-window limiter isolates clients and resets windows', () => {
  const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1_000 });

  assert.equal(limiter.check('client-a', 1_000).ok, true);
  assert.equal(limiter.check('client-a', 1_100).ok, true);
  assert.equal(limiter.check('client-a', 1_200).ok, false);
  assert.equal(limiter.check('client-b', 1_200).ok, true);
  assert.equal(limiter.check('client-a', 2_000).ok, true);
});
