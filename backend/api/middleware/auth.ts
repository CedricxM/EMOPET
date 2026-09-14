/**
 * JWT authentication middleware using jose (edge-compatible).
 */

import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

import { ACCESS_TOKEN_TTL_SECONDS, isCanonicalUserId } from '../services/auth-security.js';

const JWT_ISSUER = 'emopet-api';
const JWT_AUDIENCE = 'emopet-client';
let ephemeralTestJwtSecret: Uint8Array | null = null;

function resolveJwtSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET']?.trim();
  const isTest = process.env['NODE_ENV'] === 'test';

  if (isTest && !secret) {
    if (!ephemeralTestJwtSecret) {
      ephemeralTestJwtSecret = globalThis.crypto.getRandomValues(new Uint8Array(32));
    }
    return ephemeralTestJwtSecret;
  }

  if (!secret || secret === 'dev-secret-change-in-production' || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters outside NODE_ENV=test');
  }

  return new TextEncoder().encode(secret);
}

export interface AuthPayload {
  sub: string;
  tokenUse: 'access';
}

function parseAuthPayload(payload: jose.JWTPayload): AuthPayload | null {
  const tokenUse = payload['token_use'];
  if (!isCanonicalUserId(payload.sub) || tokenUse !== 'access') return null;
  return { sub: payload.sub, tokenUse: 'access' };
}

/**
 * Verify a bearer access token against the controlled access-token contract.
 * The secret is resolved at call time so importing this module does not silently
 * create a configured session boundary where none exists.
 */
export async function verifyAccessToken(token: string): Promise<AuthPayload> {
  const { payload } = await jose.jwtVerify(token, resolveJwtSecret(), {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  const auth = parseAuthPayload(payload);
  if (!auth) throw new Error('Invalid access token claims');
  return auth;
}

/**
 * Middleware that validates Bearer access tokens and sets canonical `userId`.
 */
export const authMiddleware = createMiddleware<{
  Variables: { userId: string; authPayload: AuthPayload };
}>(async (c, next) => {
  const pathname = new URL(c.req.url).pathname;
  const shareToken = c.req.query('share_token');
  if (
    c.req.method === 'GET' &&
    pathname.includes('/api/dogs/') &&
    pathname.endsWith('/vet-report') &&
    typeof shareToken === 'string' &&
    shareToken.length > 0
  ) {
    await next();
    return;
  }

  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = header.slice(7);
  let auth: AuthPayload;
  try {
    auth = await verifyAccessToken(token);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', auth.sub);
  c.set('authPayload', auth);
  await next();
});

/**
 * Sign a short-lived access JWT for one canonical core user UUID.
 */
export async function signAccessToken(userId: string): Promise<string> {
  if (!isCanonicalUserId(userId)) throw new Error('Cannot sign access token for a non-canonical user id');

  return new jose.SignJWT({ token_use: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(resolveJwtSecret());
}
