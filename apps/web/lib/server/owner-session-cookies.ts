import type { NextResponse } from 'next/server';

import {
  OWNER_ACCESS_COOKIE,
  OWNER_REFRESH_COOKIE,
  ownerSessionCookiePolicy,
  type OwnerSessionTokens,
} from './owner-session-provider';

export function writeOwnerSessionCookies(
  response: NextResponse,
  tokens: OwnerSessionTokens,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const policy = ownerSessionCookiePolicy(env);

  response.cookies.set(OWNER_ACCESS_COOKIE, tokens.accessToken, {
    ...policy,
    maxAge: tokens.accessTokenExpiresInSeconds,
  });
  response.cookies.set(OWNER_REFRESH_COOKIE, tokens.refreshToken, {
    ...policy,
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearOwnerAccessCookie(
  response: NextResponse,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const policy = ownerSessionCookiePolicy(env);
  response.cookies.set(OWNER_ACCESS_COOKIE, '', {
    ...policy,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function clearOwnerSessionCookies(
  response: NextResponse,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const policy = ownerSessionCookiePolicy(env);
  const expired = new Date(0);

  clearOwnerAccessCookie(response, env);
  response.cookies.set(OWNER_REFRESH_COOKIE, '', {
    ...policy,
    expires: expired,
    maxAge: 0,
  });
}
