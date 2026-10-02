import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readWorldGamificationForOwnerSession,
} from '../world-gamification-owner-session';

const ENV = {
  NODE_ENV: 'test',
  EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
} as NodeJS.ProcessEnv;

const ACCESS_A = 'access-token-value-abcdefghijklmnopqrstuvwxyz';
const ACCESS_B = 'rotated-access-token-value-abcdefghijklmnopqrstuvwxyz';
const REFRESH_A = 'emopet_rt_original-refresh-token-abcdefghijklmnopqrstuvwxyz';
const REFRESH_B = 'emopet_rt_rotated-refresh-token-abcdefghijklmnopqrstuvwxyz';

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

function rotatedTokens() {
  return {
    accessToken: ACCESS_B,
    refreshToken: REFRESH_B,
    tokenType: 'Bearer',
    accessTokenExpiresInSeconds: 900,
    refreshTokenExpiresAt: '2026-10-10T12:00:00.000Z',
  };
}

test('Owner World read uses current access token without rotating refresh', async () => {
  const calls: string[] = [];

  const result = await readWorldGamificationForOwnerSession(
    {
      accessToken: ACCESS_A,
      refreshToken: REFRESH_A,
      regionCode: 'FR-BRE',
    },
    {
      env: ENV,
      now: () => new Date('2026-10-02T12:00:00.000Z'),
      fetchImpl: (async (input, init) => {
        calls.push(String(input));
        assert.equal(init?.headers && new Headers(init.headers).get('authorization'), `Bearer ${ACCESS_A}`);
        return new Response(JSON.stringify(snapshot()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.equal(result.status, 'OK');
  if (result.status === 'OK') {
    assert.equal(result.rotatedTokens, null);
    assert.equal(result.snapshot.region.code, 'FR-BRE');
  }
  assert.deepEqual(calls, ['http://127.0.0.1:3000/api/world-gamification?region=FR-BRE']);
});

test('Owner World read rotates refresh only after backend 401 then retries once', async () => {
  const calls: Array<{ url: string; auth: string | null }> = [];

  const result = await readWorldGamificationForOwnerSession(
    {
      accessToken: ACCESS_A,
      refreshToken: REFRESH_A,
      regionCode: 'FR-BRE',
    },
    {
      env: ENV,
      now: () => new Date('2026-10-02T12:00:00.000Z'),
      fetchImpl: (async (input, init) => {
        const url = String(input);
        const auth = new Headers(init?.headers).get('authorization');
        calls.push({ url, auth });

        if (url.endsWith('/api/auth/refresh')) {
          return new Response(JSON.stringify(rotatedTokens()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (auth === `Bearer ${ACCESS_A}`) {
          return new Response(JSON.stringify({ error: 'expired' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        assert.equal(auth, `Bearer ${ACCESS_B}`);
        return new Response(JSON.stringify(snapshot()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.equal(result.status, 'OK');
  if (result.status === 'OK') {
    assert.equal(result.rotatedTokens?.accessToken, ACCESS_B);
    assert.equal(result.snapshot.region.code, 'FR-BRE');
  }
  assert.deepEqual(calls.map((entry) => entry.url), [
    'http://127.0.0.1:3000/api/world-gamification?region=FR-BRE',
    'http://127.0.0.1:3000/api/auth/refresh',
    'http://127.0.0.1:3000/api/world-gamification?region=FR-BRE',
  ]);
});

test('missing Owner session denies before World network traffic', async () => {
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
      accessToken: ACCESS_A,
      refreshToken: REFRESH_A,
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
  assert.equal(seenUrl, 'http://127.0.0.1:3000/api/world-gamification?region=GLOBAL');
});
