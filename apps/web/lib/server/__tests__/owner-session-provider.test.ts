import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loginOwnerSession,
  logoutOwnerSession,
  ownerSessionCookiePolicy,
  parseOwnerSessionTokens,
  refreshOwnerSession,
  resolveOwnerBackendOrigin,
} from '../owner-session-provider';

const NOW = new Date('2026-10-02T12:00:00.000Z');

function tokenPayload(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'access-token-value-abcdefghijklmnopqrstuvwxyz',
    refreshToken: 'emopet_rt_refresh-token-value-abcdefghijklmnopqrstuvwxyz',
    tokenType: 'Bearer',
    accessTokenExpiresInSeconds: 900,
    refreshTokenExpiresAt: '2026-10-10T12:00:00.000Z',
    ...overrides,
  };
}

test('Owner backend origin is server-only, exact and production-https', () => {
  assert.equal(
    resolveOwnerBackendOrigin({
      NODE_ENV: 'test',
      EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    } as NodeJS.ProcessEnv),
    'http://127.0.0.1:3000',
  );
  assert.equal(
    resolveOwnerBackendOrigin({
      NODE_ENV: 'test',
      EMOPET_INTERNAL_BACKEND_URL: 'http://backend.internal:3000',
    } as NodeJS.ProcessEnv),
    null,
  );
  assert.equal(
    resolveOwnerBackendOrigin({
      NODE_ENV: 'production',
      EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    } as NodeJS.ProcessEnv),
    null,
  );
  assert.equal(
    resolveOwnerBackendOrigin({
      NODE_ENV: 'production',
      EMOPET_INTERNAL_BACKEND_URL: 'https://api.example.test',
    } as NodeJS.ProcessEnv),
    'https://api.example.test',
  );
  assert.equal(
    resolveOwnerBackendOrigin({
      NODE_ENV: 'production',
      EMOPET_INTERNAL_BACKEND_URL: 'https://user:pass@api.example.test',
    } as NodeJS.ProcessEnv),
    null,
  );
});

test('Owner session token parser accepts only bounded Bearer + EMOPET refresh credentials', () => {
  const parsed = parseOwnerSessionTokens(tokenPayload(), NOW);
  assert.ok(parsed);
  assert.equal(parsed.accessTokenExpiresInSeconds, 900);
  assert.equal(parsed.refreshTokenExpiresAt.toISOString(), '2026-10-10T12:00:00.000Z');

  for (const bad of [
    tokenPayload({ tokenType: 'bearer' }),
    tokenPayload({ accessToken: 'short' }),
    tokenPayload({ accessToken: 'valid-token-value-123456\nheader' }),
    tokenPayload({ refreshToken: 'not-emopet-refresh-token-abcdefghijklmnopqrstuvwxyz' }),
    tokenPayload({ accessTokenExpiresInSeconds: 0 }),
    tokenPayload({ accessTokenExpiresInSeconds: 999999 }),
    tokenPayload({ refreshTokenExpiresAt: 'not-a-date' }),
    tokenPayload({ refreshTokenExpiresAt: '2026-10-02T11:59:59.000Z' }),
  ]) {
    assert.equal(parseOwnerSessionTokens(bad, NOW), null);
  }
});

test('Owner session cookies are HttpOnly Strict and production-secure', () => {
  assert.deepEqual(
    ownerSessionCookiePolicy({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
    },
  );
  assert.equal(
    ownerSessionCookiePolicy({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).secure,
    false,
  );
});

test('login uses canonical backend auth and never trusts a browser Owner id', async () => {
  let seenBody: unknown;
  const result = await loginOwnerSession(
    { email: 'owner@example.test', password: 'correct horse battery staple' },
    {
      now: () => NOW,
      env: {
        NODE_ENV: 'test',
        EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
      } as NodeJS.ProcessEnv,
      fetchImpl: (async (input, init) => {
        assert.equal(String(input), 'http://127.0.0.1:3000/api/auth/login');
        assert.equal(init?.method, 'POST');
        seenBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            email: 'owner@example.test',
            name: 'Owner',
          },
          ...tokenPayload(),
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    },
  );

  assert.deepEqual(seenBody, {
    email: 'owner@example.test',
    password: 'correct horse battery staple',
  });
  assert.equal(result.status, 'AUTHENTICATED');
});

test('refresh rotates through backend and malformed sessions fail before network', async () => {
  let calls = 0;
  const options = {
    now: () => NOW,
    env: {
      NODE_ENV: 'test',
      EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
    } as NodeJS.ProcessEnv,
    fetchImpl: (async (input, init) => {
      calls += 1;
      assert.equal(String(input), 'http://127.0.0.1:3000/api/auth/refresh');
      const body = JSON.parse(String(init?.body));
      assert.match(body.refreshToken, /^emopet_rt_/);
      return new Response(JSON.stringify(tokenPayload({
        accessToken: 'rotated-access-token-abcdefghijklmnopqrstuvwxyz',
        refreshToken: 'emopet_rt_rotated-refresh-token-abcdefghijklmnopqrstuvwxyz',
      })), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  };

  assert.deepEqual(
    await refreshOwnerSession('short', options),
    { status: 'DENIED', reason: 'invalid_session' },
  );
  assert.equal(calls, 0);

  const refreshed = await refreshOwnerSession(
    'emopet_rt_original-refresh-token-abcdefghijklmnopqrstuvwxyz',
    options,
  );
  assert.equal(refreshed.status, 'AUTHENTICATED');
  assert.equal(calls, 1);
});

test('logout is backend-revoked and unavailable backend stays explicit', async () => {
  const token = 'emopet_rt_logout-refresh-token-abcdefghijklmnopqrstuvwxyz';

  assert.equal(
    await logoutOwnerSession(token, {
      env: {
        NODE_ENV: 'test',
        EMOPET_INTERNAL_BACKEND_URL: 'http://127.0.0.1:3000',
      } as NodeJS.ProcessEnv,
      fetchImpl: (async () => new Response(null, { status: 204 })) as typeof fetch,
    }),
    'LOGGED_OUT',
  );

  assert.equal(
    await logoutOwnerSession(token, {
      env: {} as NodeJS.ProcessEnv,
      fetchImpl: (async () => {
        throw new Error('must not be called');
      }) as typeof fetch,
    }),
    'UNAVAILABLE',
  );
});
