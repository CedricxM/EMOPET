export const PRIVILEGED_SESSION_COOKIE = '__Host-emopet-privileged';
export const MAX_PRIVILEGED_SESSION_SECONDS = 60 * 60;

const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 8_192;

export interface PrivilegedSessionCookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
  expires: Date;
}

export interface PrivilegedSessionCookieDefinition {
  name: typeof PRIVILEGED_SESSION_COOKIE;
  value: string;
  options: PrivilegedSessionCookieOptions;
}

function validToken(value: unknown): value is string {
  return (
    typeof value === 'string'
    && value.length >= MIN_TOKEN_LENGTH
    && value.length <= MAX_TOKEN_LENGTH
    && !/\s/.test(value)
  );
}

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

export function readPrivilegedSessionToken(value: unknown): string | null {
  return validToken(value) ? value : null;
}

/**
 * Build the server-only browser session cookie for an already-issued privileged
 * token. This helper never mints or verifies the token itself.
 *
 * `__Host-` intentionally requires Secure + Path=/ and forbids Domain, binding
 * the cookie to the current origin. Authorization remains action-specific on
 * every privileged route; cookie path is not treated as an authorization wall.
 */
export function buildPrivilegedSessionCookie(input: {
  token: string;
  expiresAt: Date;
  now?: Date;
}): PrivilegedSessionCookieDefinition {
  const now = input.now ?? new Date();
  if (!validDate(now) || !validDate(input.expiresAt)) {
    throw new Error('Invalid privileged session timestamp');
  }
  if (!validToken(input.token)) {
    throw new Error('Invalid privileged session token');
  }

  const remainingMs = input.expiresAt.getTime() - now.getTime();
  const maxAge = Math.floor(remainingMs / 1_000);
  if (maxAge < 1 || maxAge > MAX_PRIVILEGED_SESSION_SECONDS) {
    throw new Error('Privileged session lifetime is outside the allowed bound');
  }

  return Object.freeze({
    name: PRIVILEGED_SESSION_COOKIE,
    value: input.token,
    options: Object.freeze({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge,
      expires: new Date(input.expiresAt.getTime()),
    }),
  });
}

export function buildClearedPrivilegedSessionCookie(): PrivilegedSessionCookieDefinition {
  return Object.freeze({
    name: PRIVILEGED_SESSION_COOKIE,
    value: '',
    options: Object.freeze({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    }),
  });
}
