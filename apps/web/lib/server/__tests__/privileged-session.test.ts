import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_PRIVILEGED_SESSION_SECONDS,
  PRIVILEGED_SESSION_COOKIE,
  buildClearedPrivilegedSessionCookie,
  buildPrivilegedSessionCookie,
  readPrivilegedSessionToken,
} from '../privileged-session';

const TOKEN = 'privileged.jwt.fixture.value.1234567890';

test('privileged session cookie is server-only, host-bound and strict same-site', () => {
  const now = new Date('2026-09-04T09:00:00.000Z');
  const expiresAt = new Date('2026-09-04T09:10:00.000Z');
  const cookie = buildPrivilegedSessionCookie({ token: TOKEN, expiresAt, now });

  assert.equal(cookie.name, PRIVILEGED_SESSION_COOKIE);
  assert.equal(cookie.name.startsWith('__Host-'), true);
  assert.equal(cookie.value, TOKEN);
  assert.deepEqual(cookie.options, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 600,
    expires: expiresAt,
  });
  assert.equal('domain' in cookie.options, false);
});

test('privileged session cannot outlive the bounded privileged assurance', () => {
  const now = new Date('2026-09-04T09:00:00.000Z');

  assert.throws(
    () => buildPrivilegedSessionCookie({ token: TOKEN, expiresAt: now, now }),
    /lifetime/i,
  );
  assert.throws(
    () => buildPrivilegedSessionCookie({
      token: TOKEN,
      expiresAt: new Date(now.getTime() + (MAX_PRIVILEGED_SESSION_SECONDS + 1) * 1_000),
      now,
    }),
    /lifetime/i,
  );

  const almostExpired = buildPrivilegedSessionCookie({
    token: TOKEN,
    expiresAt: new Date(now.getTime() + 1_999),
    now,
  });
  assert.equal(almostExpired.options.maxAge, 1);
  assert.equal(almostExpired.options.expires.getTime(), now.getTime() + 1_999);
});

test('privileged session rejects malformed tokens and timestamps', () => {
  const now = new Date('2026-09-04T09:00:00.000Z');
  const expiresAt = new Date('2026-09-04T09:10:00.000Z');

  for (const token of ['', 'short', 'token with spaces']) {
    assert.equal(readPrivilegedSessionToken(token), null);
    assert.throws(
      () => buildPrivilegedSessionCookie({ token, expiresAt, now }),
      /token/i,
    );
  }
  assert.equal(readPrivilegedSessionToken(TOKEN), TOKEN);
  assert.equal(readPrivilegedSessionToken(null), null);

  assert.throws(
    () => buildPrivilegedSessionCookie({ token: TOKEN, expiresAt: new Date('invalid'), now }),
    /timestamp/i,
  );
  assert.throws(
    () => buildPrivilegedSessionCookie({ token: TOKEN, expiresAt, now: new Date('invalid') }),
    /timestamp/i,
  );
});

test('privileged session clear operation preserves hardened attributes', () => {
  const cleared = buildClearedPrivilegedSessionCookie();

  assert.deepEqual(cleared, {
    name: PRIVILEGED_SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    },
  });
  assert.equal('domain' in cleared.options, false);
});
