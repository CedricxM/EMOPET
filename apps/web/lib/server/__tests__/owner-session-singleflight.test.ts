import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ownerRefreshSingleFlightInFlightCountForTests,
  refreshOwnerSessionSingleFlight,
} from '../owner-session-singleflight';

const TOKEN = `emopet_rt_${'a'.repeat(48)}`;
const TOKENS = {
  tokenType: 'Bearer',
  accessToken: 'canonical-owner-access-token-123456',
  refreshToken: `emopet_rt_${'b'.repeat(48)}`,
  accessTokenExpiresInSeconds: 900,
  refreshTokenExpiresAt: '2026-10-04T08:00:00.000Z',
};

test('same refresh credential shares one backend flight within a runtime instance', async () => {
  let backendCalls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetchImpl = async () => {
    backendCalls += 1;
    await gate;
    return new Response(JSON.stringify(TOKENS), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const options = {
    fetchImpl: fetchImpl as typeof fetch,
    env: { NODE_ENV: 'test', EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000' } as NodeJS.ProcessEnv,
    now: () => new Date('2026-10-03T08:00:00.000Z'),
  };
  const first = refreshOwnerSessionSingleFlight(TOKEN, options);
  const second = refreshOwnerSessionSingleFlight(TOKEN, options);
  assert.strictEqual(first, second);
  assert.equal(backendCalls, 1);
  assert.equal(ownerRefreshSingleFlightInFlightCountForTests(), 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.deepEqual(a, b);
  assert.equal(a.status, 'AUTHENTICATED');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ownerRefreshSingleFlightInFlightCountForTests(), 0);
});

test('different refresh credentials never share a flight', async () => {
  let backendCalls = 0;
  const fetchImpl = async () => {
    backendCalls += 1;
    return new Response(JSON.stringify(TOKENS), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const options = {
    fetchImpl: fetchImpl as typeof fetch,
    env: { NODE_ENV: 'test', EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000' } as NodeJS.ProcessEnv,
    now: () => new Date('2026-10-03T08:00:00.000Z'),
  };
  await Promise.all([
    refreshOwnerSessionSingleFlight(TOKEN, options),
    refreshOwnerSessionSingleFlight(`emopet_rt_${'c'.repeat(48)}`, options),
  ]);
  assert.equal(backendCalls, 2);
});
