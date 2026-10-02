import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  fetchWorldGamificationReadSnapshot,
  parseWorldGamificationReadSnapshot,
  WorldGamificationClientError,
} from '../world-gamification-read';

const AUTHORITY = 'CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY';

function validSnapshot() {
  return {
    authority: AUTHORITY,
    region: {
      code: 'FR-BRE',
      identityName: 'Breiz',
      themeId: 'world-bretagne',
    },
    resources: {
      knowledgeFragments: 1,
      localDiscoveries: 2,
      walkTraces: 0,
      communitySeeds: 0,
      memoryThreads: 0,
    },
    quests: [
      {
        id: 'learn-three',
        title: 'Read 3 knowledge cards',
        category: 'learning',
        eventKind: 'knowledge.card_read',
        current: 1,
        target: 3,
        completed: false,
      },
    ],
    whyEarned: {
      authority: AUTHORITY,
      items: [
        {
          eventId: '11111111-1111-4111-8111-111111111111',
          reasonCode: 'knowledge_read',
          grants: { knowledgeFragments: 1 },
          recordedAt: '2026-10-02T10:00:00.000Z',
        },
      ],
      grossEarned: {
        knowledgeFragments: 1,
        localDiscoveries: 2,
        walkTraces: 0,
        communitySeeds: 0,
        memoryThreads: 0,
      },
    },
    collectionItems: [
      {
        id: 'breiz-learning-sail',
        title: 'Learning sail',
        owned: false,
        affordable: false,
      },
    ],
    ownedItemIds: ['community-bench'],
  };
}

test('parses the bounded Gate 4 public contract', () => {
  assert.deepEqual(
    parseWorldGamificationReadSnapshot(validSnapshot()),
    validSnapshot(),
  );
});

test('rejects raw source identifiers and unknown public fields', () => {
  const withRawSource = validSnapshot();
  withRawSource.whyEarned.items[0] = {
    ...withRawSource.whyEarned.items[0],
    sourceRef: 'knowledge:secret-source',
  } as typeof withRawSource.whyEarned.items[number];

  assert.throws(
    () => parseWorldGamificationReadSnapshot(withRawSource),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseWorldGamificationReadSnapshot({
      ...validSnapshot(),
      xp: 9001,
    }),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE',
  );
});

test('rejects malformed balances, grants and duplicate ownership', () => {
  const negative = validSnapshot();
  negative.resources.localDiscoveries = -1;
  assert.throws(
    () => parseWorldGamificationReadSnapshot(negative),
    /WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE/,
  );

  const badGrant = validSnapshot();
  badGrant.whyEarned.items[0]!.grants = { knowledgeFragments: 0 };
  assert.throws(
    () => parseWorldGamificationReadSnapshot(badGrant),
    /WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE/,
  );

  const duplicateOwnership = validSnapshot();
  duplicateOwnership.ownedItemIds = ['community-bench', 'community-bench'];
  assert.throws(
    () => parseWorldGamificationReadSnapshot(duplicateOwnership),
    /WORLD_GAMIFICATION_CLIENT_INVALID_RESPONSE/,
  );
});

test('GET client sends only Bearer auth and coarse region, then validates the response', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(validSnapshot()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const snapshot = await fetchWorldGamificationReadSnapshot({
    accessToken: 'header.payload.signature-value',
    regionCode: 'fr-bre',
    apiBaseUrl: 'https://api.example.test/',
    fetchImpl,
  });

  assert.equal(snapshot.region.code, 'FR-BRE');
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]?.url,
    'https://api.example.test/api/world-gamification?region=FR-BRE',
  );
  assert.equal(calls[0]?.init?.method, 'GET');
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(
    headers.get('authorization'),
    'Bearer header.payload.signature-value',
  );
  assert.equal(calls[0]?.init?.body, undefined);
  assert.equal(calls[0]?.init?.cache, 'no-store');
});

test('client fails closed before network on missing auth or non-coarse region', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    () => fetchWorldGamificationReadSnapshot({
      accessToken: 'short',
      fetchImpl,
    }),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_AUTH_REQUIRED',
  );

  await assert.rejects(
    () => fetchWorldGamificationReadSnapshot({
      accessToken: 'header.payload.signature-value',
      regionCode: '48.8566,2.3522',
      fetchImpl,
    }),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_INVALID_REGION',
  );

  assert.equal(calls, 0);
});

test('HTTP and network failures expose finite client codes without raw bodies', async () => {
  await assert.rejects(
    () => fetchWorldGamificationReadSnapshot({
      accessToken: 'header.payload.signature-value',
      fetchImpl: (async () => new Response('secret body', { status: 503 })) as typeof fetch,
    }),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_UNAVAILABLE'
      && !error.message.includes('secret body'),
  );

  await assert.rejects(
    () => fetchWorldGamificationReadSnapshot({
      accessToken: 'header.payload.signature-value',
      fetchImpl: (async () => {
        throw new Error('provider socket details');
      }) as typeof fetch,
    }),
    (error) => error instanceof WorldGamificationClientError
      && error.code === 'WORLD_GAMIFICATION_CLIENT_UNAVAILABLE'
      && !error.message.includes('provider'),
  );
});

async function collectSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...await collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

test('Gate 5A client remains unactivated and independent from legacy browser authority', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const webRoot = path.resolve(here, '../..');
  const clientPath = path.resolve(webRoot, 'lib/world-gamification-read.ts');
  const clientSource = await readFile(clientPath, 'utf8');

  assert.doesNotMatch(clientSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(clientSource, /\.\/gamification|@\/lib\/gamification/);
  assert.doesNotMatch(clientSource, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);

  const allowedLibraryAdapters = new Set([
    path.resolve(webRoot, 'lib/world-owner-auth.ts'),
    // Gate 5C server-only BFF bridge. This file never ships the bearer token to
    // browser JS and Gate 5C remains activated:false until explicit cutover.
    path.resolve(webRoot, 'lib/server/world-gamification-owner-session.ts'),
  ]);

  for (const rootName of ['app', 'components', 'lib']) {
    const root = path.join(webRoot, rootName);
    for (const file of await collectSourceFiles(root)) {
      const resolved = path.resolve(file);
      if (resolved === clientPath || allowedLibraryAdapters.has(resolved)) continue;
      const source = await readFile(file, 'utf8');
      assert.equal(
        source.includes('world-gamification-read'),
        false,
        `${file} activates Gate 5A before an explicit cutover decision`,
      );
    }
  }
});
