import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDogOwnershipAuthorizer,
  isCanonicalUuid,
} from '../dist/api/middleware/authorization.js';
import { createFixedWindowLimiter } from '../dist/api/middleware/rate-limit.js';

const DOG_ID = '11111111-1111-4111-8111-111111111111';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

test('dog ownership authorizer requires canonical UUID identities and hides cross-user dogs', async () => {
  const owners = new Map([[DOG_ID, USER_A]]);
  const authorize = createDogOwnershipAuthorizer({
    async findDogOwnerId(dogId) {
      return owners.get(dogId) ?? null;
    },
  });

  assert.equal(isCanonicalUuid(USER_A), true);
  assert.equal(isCanonicalUuid('user-a'), false);
  assert.equal(isCanonicalUuid(` ${USER_A} `), false);

  assert.equal((await authorize(USER_A, DOG_ID)).ok, true);

  const crossUser = await authorize(USER_B, DOG_ID);
  assert.equal(crossUser.ok, false);
  assert.equal(crossUser.status, 404);
  assert.equal(crossUser.error, 'not_found');

  const missingUser = await authorize(null, DOG_ID);
  assert.equal(missingUser.ok, false);
  assert.equal(missingUser.status, 401);

  const nonCanonicalUser = await authorize('user-a', DOG_ID);
  assert.equal(nonCanonicalUser.ok, false);
  assert.equal(nonCanonicalUser.status, 401);
  assert.equal(nonCanonicalUser.error, 'unauthorized');

  const invalidDogId = await authorize(USER_A, 'not-a-uuid');
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
