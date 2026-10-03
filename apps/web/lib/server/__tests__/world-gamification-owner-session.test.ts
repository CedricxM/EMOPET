import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readWorldGamificationForOwnerSession,
} from '../world-gamification-owner-session';

const ENV = {
  NODE_ENV: 'test',
  EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
} as NodeJS.ProcessEnv;

const ACCESS = 'access-token-value-abcdefghijklmnopqrstuvwxyz';

function snapshot() {
  return {
    authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
    region: {
      code: 'FR-BRE',
      identityName: 'Breiz',
      themeId: 'breiz-v1',
    },
    resources: {
      knowledgeFragments: 1,
      localDiscoveries: 2,
      walkTraces: 0,
      communitySeeds: 0,
      memoryThreads: 0,
    },
    quests: [],
    whyEarned: {
      authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
      items: [],
      grossEarned: {
        knowledgeFragments: 1,
        localDiscoveries: 2,
        walkTraces: 0,
        communitySeeds: 0,
        memoryThreads: 0,
      },
    },
    collectionItems: [],
    ownedItemIds: [],
  };
}

test('Owner World read uses the current access token without touching refresh authority', async () => {
  const calls: string[] = [];

  const result = await readWorldGamificationForOwnerSession(
    {
      accessToken: ACCESS,
      regionCode: 'FR-BRE',
    },
    {
      env: ENV,
      fetchImpl: (async (input, init) => {
        calls.push(String(input));
        assert.equal(
          init?.headers && new Headers(init.headers).get('authorization'),
          `Bearer ${ACCESS}`,
        );
        return new Response(JSON.stringify(snapshot()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.equal(result.status, 'OK');
  if (result.status === 'OK') {
    assert.equal(result.snapshot.region.code, 'FR-BRE');
  }
  assert.deepEqual(calls, [
    'http://127.0.0.1:3000/api/world-gamification?region=FR-BRE',
  ]);
});

test('expired access returns DENIED and never consumes a refresh credential from GET', async () => {
  const calls: string[] = [];

  const result = await readWorldGamificationForOwnerSession(
    {
      accessToken: ACCESS,
      regionCode: 'FR-BRE',
    },
    {
      env: ENV,
      fetchImpl: (async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ error: 'expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.deepEqual(result, { status: 'DENIED' });
  assert.deepEqual(calls, [
    'http://127.0.0.1:3000/api/world-gamification?region=FR-BRE',
  ]);
  assert.equal(calls.some((url) => url.includes('/api/auth/refresh')), false);
});

test('missing Owner access denies before World network traffic', async () => {
  let calls = 0;
  const result = await readWorldGamificationForOwnerSession(
    { regionCode: 'FR-BRE' },
    {
      env: ENV,
      fetchImpl: (async () => {
        calls += 1;
        throw new Error('must not be called');
      }) as typeof fetch,
    },
  );

  assert.deepEqual(result, { status: 'DENIED' });
  assert.equal(calls, 0);
});

test('coarse region remains bounded and coordinate-like input falls back to GLOBAL', async () => {
  let seenUrl = '';
  const result = await readWorldGamificationForOwnerSession(
    {
      accessToken: ACCESS,
      regionCode: '48.8566,2.3522',
    },
    {
      env: ENV,
      fetchImpl: (async (input) => {
        seenUrl = String(input);
        const body = snapshot();
        body.region.code = 'GLOBAL';
        body.region.identityName = 'Emopet';
        body.region.themeId = 'global-v1';
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.equal(result.status, 'OK');
  assert.equal(
    seenUrl,
    'http://127.0.0.1:3000/api/world-gamification?region=GLOBAL',
  );
});
