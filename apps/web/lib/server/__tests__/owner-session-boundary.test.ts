import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginRoute = readFileSync(
  new URL('../../../app/api/owner-session/login/route.ts', import.meta.url),
  'utf8',
);
const logoutRoute = readFileSync(
  new URL('../../../app/api/owner-session/logout/route.ts', import.meta.url),
  'utf8',
);
const worldRoute = readFileSync(
  new URL('../../../app/api/world-gamification/session/route.ts', import.meta.url),
  'utf8',
);
const provider = readFileSync(
  new URL('../owner-session-provider.ts', import.meta.url),
  'utf8',
);
const cookies = readFileSync(
  new URL('../owner-session-cookies.ts', import.meta.url),
  'utf8',
);

test('Owner session transport remains HttpOnly Strict and server-origin bound', () => {
  assert.match(provider, /EMOPET_INTERNAL_BACKEND_URL/);
  assert.match(provider, /httpOnly:\s*true/);
  assert.match(provider, /sameSite:\s*'strict'/);
  assert.match(provider, /secure:\s*env\.NODE_ENV === 'production'/);

  assert.match(cookies, /OWNER_ACCESS_COOKIE/);
  assert.match(cookies, /OWNER_REFRESH_COOKIE/);
  assert.doesNotMatch(cookies, /localStorage|sessionStorage|document\.cookie/);
});

test('Owner login/logout require same-origin browser mutations and reject browser bearer mixing', () => {
  for (const source of [loginRoute, logoutRoute]) {
    assert.match(source, /evaluateOwnerSessionMutationOrigin/);
    assert.match(source, /resolveOwnerWebOrigin/);
    assert.match(source, /req\.headers\.has\('authorization'\)/);
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
  }
});

test('World Owner BFF accepts no Owner id and no browser Authorization header', () => {
  assert.match(worldRoute, /req\.headers\.has\('authorization'\)/);
  assert.match(worldRoute, /key !== 'region'/);
  assert.match(worldRoute, /OWNER_ACCESS_COOKIE/);
  assert.match(worldRoute, /OWNER_REFRESH_COOKIE/);

  assert.doesNotMatch(worldRoute, /ownerId|owner_id|userId|user_id/);
  assert.doesNotMatch(worldRoute, /localStorage|sessionStorage|geolocation|latitude|longitude/);
  assert.doesNotMatch(worldRoute, /world-gamification-read/);
});

test('browser-facing login response never serializes access or refresh credentials', () => {
  assert.doesNotMatch(loginRoute, /accessToken|refreshToken|tokenType/);
  assert.match(loginRoute, /authenticated:\s*true/);
  assert.match(loginRoute, /writeOwnerSessionCookies/);
});
