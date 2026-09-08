import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LEGACY_COMMUNITY_DISABLED_CODE,
  LEGACY_COMMUNITY_DEMO_ENV,
  isLegacyCommunityDemoAllowed,
  legacyCommunityAuthorityGate,
} from '../server/community-authority';

test('legacy Community data plane is disabled by default', async () => {
  const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), false);
  const response = legacyCommunityAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);

  const body = await response.json();
  assert.equal(body.code, LEGACY_COMMUNITY_DISABLED_CODE);
  assert.equal(body.authority, 'Hono + durable Product V1 persistence');
});

test('legacy Community demo requires explicit non-production opt-in', () => {
  const env = {
    NODE_ENV: 'development',
    [LEGACY_COMMUNITY_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), true);
  assert.equal(legacyCommunityAuthorityGate(env), null);
});

test('production cannot enable legacy Community even with demo opt-in', async () => {
  const env = {
    NODE_ENV: 'production',
    [LEGACY_COMMUNITY_DEMO_ENV]: '1',
  } as NodeJS.ProcessEnv;

  assert.equal(isLegacyCommunityDemoAllowed(env), false);
  const response = legacyCommunityAuthorityGate(env);
  assert.ok(response);
  assert.equal(response.status, 503);
});
