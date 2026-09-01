import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RegisterSchema, LoginSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { authRefreshSessions, users } from '../../db/schema/index.js';
import { authMiddleware, signAccessToken } from '../middleware/auth.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  verifyPassword,
} from '../services/auth-security.js';
import {
  issueRefreshCredential,
  rotateRefreshCredential,
  type RefreshSessionRepository,
} from '../services/auth-sessions.js';

const auth = new Hono<{ Variables: { userId: string } }>();

function readRefreshToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { refreshToken?: unknown }).refreshToken;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= 32 && trimmed.length <= 512 ? trimmed : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}

function tokenResponse(accessToken: string, refreshToken: string, refreshTokenExpiresAt: Date) {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer' as const,
    accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
  };
}

auth.post('/register', zValidator('json', RegisterSchema), async (c) => {
  const body = c.req.valid('json');
  const email = normalizeEmail(body.email);
  const passwordHash = await hashPassword(body.password);

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          name: body.name.trim(),
          // Registration is not treated as privacy consent.
          gdprConsentAt: null,
        })
        .returning({ id: users.id, email: users.email, name: users.name });

      if (!user) throw new Error('Failed to create user');

      const credential = issueRefreshCredential(user.id);
      await tx.insert(authRefreshSessions).values(credential.session);

      return { user, credential };
    });

    const accessToken = await signAccessToken(result.user.id);
    return c.json({
      user: result.user,
      ...tokenResponse(accessToken, result.credential.rawToken, result.credential.session.expiresAt),
    }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return c.json({ error: 'Account already exists' }, 409);
    }
    throw error;
  }
});

auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  const body = c.req.valid('json');
  const email = normalizeEmail(body.email);

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    // Run one controlled KDF even when the account does not exist to reduce the
    // obvious timing difference between an unknown email and a wrong password.
    await hashPassword(body.password);
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash);
  if (!passwordOk) return c.json({ error: 'Invalid credentials' }, 401);

  const credential = issueRefreshCredential(user.id);
  await db.insert(authRefreshSessions).values(credential.session);
  const accessToken = await signAccessToken(user.id);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    ...tokenResponse(accessToken, credential.rawToken, credential.session.expiresAt),
  });
});

auth.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = readRefreshToken(body);
  if (!refreshToken) return c.json({ error: 'Invalid refresh token' }, 400);

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const repository: RefreshSessionRepository = {
      async findByTokenHash(tokenHash) {
        const [row] = await tx
          .select({
            id: authRefreshSessions.id,
            userId: authRefreshSessions.userId,
            familyId: authRefreshSessions.familyId,
            tokenHash: authRefreshSessions.tokenHash,
            expiresAt: authRefreshSessions.expiresAt,
            revokedAt: authRefreshSessions.revokedAt,
            revokeReason: authRefreshSessions.revokeReason,
          })
          .from(authRefreshSessions)
          .where(eq(authRefreshSessions.tokenHash, tokenHash))
          .limit(1);
        return row ?? null;
      },
      async lockFamily(familyId) {
        // One transaction-scoped lock per refresh family. Hash collisions can
        // only over-serialize unrelated families; they cannot weaken safety.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${familyId}, 0))`);
      },
      async revokeIfActive(id, reason, at) {
        const rows = await tx
          .update(authRefreshSessions)
          .set({ revokedAt: at, revokeReason: reason, lastUsedAt: at })
          .where(and(eq(authRefreshSessions.id, id), isNull(authRefreshSessions.revokedAt)))
          .returning({ id: authRefreshSessions.id });
        return rows.length === 1;
      },
      async revokeActiveFamily(familyId, reason, at) {
        await tx
          .update(authRefreshSessions)
          .set({ revokedAt: at, revokeReason: reason, lastUsedAt: at })
          .where(and(eq(authRefreshSessions.familyId, familyId), isNull(authRefreshSessions.revokedAt)));
      },
      async insert(session) {
        await tx.insert(authRefreshSessions).values(session);
      },
    };

    return rotateRefreshCredential(repository, refreshToken, now);
  });

  if (!result.ok) return c.json({ error: 'Invalid or expired refresh token' }, 401);

  const accessToken = await signAccessToken(result.userId);
  return c.json(tokenResponse(
    accessToken,
    result.credential.rawToken,
    result.credential.session.expiresAt,
  ));
});

auth.post('/logout', async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = readRefreshToken(body);
  if (!refreshToken) return c.json({ error: 'Invalid refresh token' }, 400);

  const now = new Date();
  await db
    .update(authRefreshSessions)
    .set({ revokedAt: now, revokeReason: 'logout', lastUsedAt: now })
    .where(and(
      eq(authRefreshSessions.tokenHash, hashRefreshToken(refreshToken)),
      isNull(authRefreshSessions.revokedAt),
    ));

  // Idempotent response avoids disclosing whether the supplied token existed.
  return c.body(null, 204);
});

auth.post('/logout-all', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const now = new Date();

  await db
    .update(authRefreshSessions)
    .set({ revokedAt: now, revokeReason: 'logout_all', lastUsedAt: now })
    .where(and(eq(authRefreshSessions.userId, userId), isNull(authRefreshSessions.revokedAt)));

  return c.body(null, 204);
});

export { auth };
