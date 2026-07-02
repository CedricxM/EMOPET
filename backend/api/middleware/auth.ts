/**
 * JWT authentication middleware using jose (edge-compatible).
 */

import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

function resolveJwtSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET']?.trim();
  const isTest = process.env['NODE_ENV'] === 'test';
  if (!secret || secret === 'dev-secret-change-in-production') {
    if (isTest) {
      return new TextEncoder().encode('dev-secret-change-in-production');
    }
    throw new Error('JWT_SECRET must be configured outside NODE_ENV=test');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = resolveJwtSecret();

export interface AuthPayload {
  sub: string; // user ID
  email: string;
}

/**
 * Middleware that validates Bearer token and sets `c.var.userId`.
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
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    const auth = payload as unknown as AuthPayload;
    if (typeof auth.sub !== 'string' || !auth.sub.trim()) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    c.set('userId', auth.sub);
    c.set('authPayload', auth);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

/**
 * Sign a new JWT for a user.
 */
export async function signToken(payload: AuthPayload): Promise<string> {
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}
