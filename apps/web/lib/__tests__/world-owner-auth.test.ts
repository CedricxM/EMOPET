import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  fetchWorldGamificationForOwnerSession,
  WorldOwnerAuthAdapterError,
} from '../world-owner-auth';

test('Owner auth adapter rejects missing or malformed access tokens before network', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error('network should not be reached');
  };

  for (const accessToken of ['', 'short', 'token with spaces', 'line\nbreak']) {
    await assert.rejects(
      fetchWorldGamificationForOwnerSession({
        accessToken,
        fetchImpl: fetchImpl as typeof fetch,
      }),
      (error: unknown) => error instanceof WorldOwnerAuthAdapterError,
    );
  }
  assert.equal(calls, 0);
});

test('Owner auth adapter forwards only canonical Bearer input to World read client', async () => {
  let request: { url: string; init?: RequestInit } | null = null;
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({
      authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
      region: { code: 'GLOBAL', identityName: 'EMOPET World', themeId: 'global' },
      resources: {
        knowledgeFragments: 0,
        localDiscoveries: 0,
        walkTraces: 0,
        communitySeeds: 0,
        memoryThreads: 0,
      },
      quests: [],
      whyEarned: {
        authority: 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY',
        items: [],
        grossEarned: {
          knowledgeFragments: 0,
          localDiscoveries: 0,
          walkTraces: 0,
          communitySeeds: 0,
          memoryThreads: 0,
        },
      },
      collectionItems: [],
      ownedItemIds: [],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  await fetchWorldGamificationForOwnerSession({
    accessToken: 'canonical-owner-access-token-123456',
    regionCode: 'GLOBAL',
    apiBaseUrl: 'https://api.example.test',
    fetchImpl: fetchImpl as typeof fetch,
  });

  assert.ok(request);
  assert.equal(request.url, 'https://api.example.test/api/world-gamification?region=GLOBAL');
  const headers = request.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer canonical-owner-access-token-123456');
  assert.equal(request.init?.method, 'GET');
});

test('Owner auth adapter has no Owner-id, refresh-token or browser-storage authority', async () => {
  const source = await readFile(new URL('../world-owner-auth.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /ownerId\s*:/);
  assert.doesNotMatch(source, /refreshToken\s*:/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /\/api\/auth\/(?:login|refresh)/);
  assert.doesNotMatch(source, /POST|PUT|PATCH|DELETE/);
});
