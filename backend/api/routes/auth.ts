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

type AuthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withAuthSessionTransaction<T>(operation: (tx: AuthTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    return operation(tx);
  });
}

// Every session mutation for an existing account locks user before family/token.
// Password KDF and JWT signing stay outside these short database transactions.
async function lockAuthUser(tx: AuthTransaction, userId: string) {
  const [user] = await tx.select({
    id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash,
  }).from(users).where(eq(users.id, userId)).limit(1).for('update');
  return user;
}

function readRefreshToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { refreshToken?: unknown }).refreshToken;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= 32 && trimmed.length <= 512 ? trimmed : null;
}

function hasDatabaseErrorCode(error: unknown, expectedCode: string): boolean {
  let current: unknown = error;
  const seen = new Set<object>();

  for (let depth = 0; depth < 8; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    if (seen.has(current)) return false;
    seen.add(current);

    if ('code' in current && (current as { code?: unknown }).code === expectedCode) {
      return true;
    }

    current = 'cause' in current ? (current as { cause?: unknown }).cause : null;
  }

  return false;
}

function isUniqueViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, '23505');
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
          gdprConsentAt: null,
        })
        .returning({ id: users.id, email: users.email, name: users.name });

      if (!user) throw new Error('Failed to create user');

      const credential = issueRefreshCredential(user.id);
      await tx.insert(authRefreshSessions).values(credential.session);

      return { user, credential };
    });

    const accessToken = await signAccessToken(result.user.id);
    c.header('Cache-Control', 'no-store');
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
    await hashPassword(body.password);
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash);
  if (!passwordOk) return c.json({ error: 'Invalid credentials' }, 401);

  const result = await withAuthSessionTransaction(async (tx) => {
    const currentUser = await lockAuthUser(tx, user.id);
    // A credential change/deletion while the KDF ran invalidates the preflight.
    if (!currentUser || currentUser.passwordHash !== user.passwordHash) return null;
    const credential = issueRefreshCredential(currentUser.id);
    await tx.insert(authRefreshSessions).values(credential.session);
    return { user: currentUser, credential };
  });
  if (!result) return c.json({ error: 'Invalid credentials' }, 401);
  const { credential } = result;
  const accessToken = await signAccessToken(user.id);

  c.header('Cache-Control', 'no-store');
  return c.json({
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    ...tokenResponse(accessToken, credential.rawToken, credential.session.expiresAt),
  });
});

auth.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => null);
  const refreshToken = readRefreshToken(body);
  if (!refreshToken) return c.json({ error: 'Invalid refresh token' }, 400);

  const result = await withAuthSessionTransaction(async (tx) => {
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
      async lockUser(userId) {
        return Boolean(await lockAuthUser(tx, userId));
      },
      async lockFamily(familyId) {
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

    return rotateRefreshCredential(repository, refreshToken);
  });

  if (!result.ok) return c.json({ error: 'Invalid or expired refresh token' }, 401);

  const accessToken = await signAccessToken(result.userId);
  c.header('Cache-Control', 'no-store');
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

  await withAuthSessionTransaction(async (tx) => {
    const [session] = await tx.select({
      userId: authRefreshSessions.userId, familyId: authRefreshSessions.familyId,
    }).from(authRefreshSessions)
      .where(eq(authRefreshSessions.tokenHash, hashRefreshToken(refreshToken))).limit(1);
    if (!session || !await lockAuthUser(tx, session.userId)) return;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${session.familyId}, 0))`);
    const now = new Date();
    // A rotated token still identifies this login session. Revoke its active
    // successor too, without revoking other independently authenticated logins.
    await tx.update(authRefreshSessions)
      .set({ revokedAt: now, revokeReason: 'logout', lastUsedAt: now })
      .where(and(
        eq(authRefreshSessions.userId, session.userId),
        eq(authRefreshSessions.familyId, session.familyId),
        isNull(authRefreshSessions.revokedAt),
      ));
  });

  c.header('Cache-Control', 'no-store');
  return c.body(null, 204);
});

auth.post('/logout-all', authMiddleware, async (c) => {
  const userId = c.get('userId');
  await withAuthSessionTransaction(async (tx) => {
    if (!await lockAuthUser(tx, userId)) return;
    const now = new Date();
    await tx.update(authRefreshSessions)
      .set({ revokedAt: now, revokeReason: 'logout_all', lastUsedAt: now })
      .where(and(eq(authRefreshSessions.userId, userId), isNull(authRefreshSessions.revokedAt)));
  });

  c.header('Cache-Control', 'no-store');
  return c.body(null, 204);
});

export { auth };
