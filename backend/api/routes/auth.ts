import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  EmailVerificationConsumeSchema,
  EmailVerificationResendSchema,
  LoginSchema,
  RegisterSchema,
} from '@emopet/shared';

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
import {
  buildEmailVerificationUrl,
  deliverEmailVerification,
} from '../services/auth-email-delivery.js';
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from '../services/auth-email-verification.js';

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
    id: users.id,
    email: users.email,
    name: users.name,
    passwordHash: users.passwordHash,
    emailVerifiedAt: users.emailVerifiedAt,
    emailVerificationRequiredAt: users.emailVerificationRequiredAt,
  }).from(users).where(eq(users.id, userId)).limit(1).for('update');
  return user;
}

type LockedAuthUser = NonNullable<Awaited<ReturnType<typeof lockAuthUser>>>;
type LoginSessionResult =
  | {
      ok: false;
      reason: 'invalid_credentials' | 'email_verification_required';
    }
  | {
      ok: true;
      user: LockedAuthUser;
      credential: ReturnType<typeof issueRefreshCredential>;
    };

function readRefreshToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { refreshToken?: unknown }).refreshToken;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= 32 && trimmed.length <= 512 ? trimmed : null;
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

const GENERIC_EMAIL_VERIFICATION_ACK = Object.freeze({
  status: 'accepted' as const,
  message: 'If this email is eligible, verification instructions will be sent.',
});

function requiresEmailVerification(user: {
  emailVerifiedAt: Date | null;
  emailVerificationRequiredAt: Date | null;
}): boolean {
  return user.emailVerificationRequiredAt !== null && user.emailVerifiedAt === null;
}

async function issueAndDeliverEmailVerification(userId: string, email: string): Promise<void> {
  const issued = await issueEmailVerificationToken(userId, email);
  if (!issued.ok) return;

  const verificationUrl = buildEmailVerificationUrl(issued.rawToken);
  if (!verificationUrl) return;

  // Delivery outcome is intentionally not reflected in the public response.
  // The raw token never leaves the provider message path.
  await deliverEmailVerification({ to: email, verificationUrl });
}

function genericEmailVerificationAcknowledgement(c: Context) {
  c.header('Cache-Control', 'no-store');
  return c.json(GENERIC_EMAIL_VERIFICATION_ACK, 202);
}

auth.post('/register', zValidator('json', RegisterSchema), async (c) => {
  const body = c.req.valid('json');
  const email = normalizeEmail(body.email);

  // Always pay the password-KDF cost before account-state branching.
  const passwordHash = await hashPassword(body.password);
  const now = new Date();

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: body.name.trim(),
      gdprConsentAt: null,
      emailVerificationRequiredAt: now,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      emailVerificationRequiredAt: users.emailVerificationRequiredAt,
    });

  let target = created ?? null;
  if (!target) {
    const [existing] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        emailVerificationRequiredAt: users.emailVerificationRequiredAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    target = existing ?? null;
  }

  if (
    target
    && target.emailVerificationRequiredAt !== null
    && !target.emailVerifiedAt
  ) {
    await issueAndDeliverEmailVerification(target.id, target.email);
  }

  return genericEmailVerificationAcknowledgement(c);
});

auth.post(
  '/verify-email',
  zValidator('json', EmailVerificationConsumeSchema),
  async (c) => {
    const { token, password } = c.req.valid('json');
    const verified = await consumeEmailVerificationToken(token, password);

    c.header('Cache-Control', 'no-store');
    if (!verified) {
      return c.json({ error: 'Invalid or expired verification token' }, 400);
    }

    return c.json({
      verified: true,
      next: 'login',
    });
  },
);

auth.post(
  '/verify-email/resend',
  zValidator('json', EmailVerificationResendSchema),
  async (c) => {
    const email = normalizeEmail(c.req.valid('json').email);

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        emailVerificationRequiredAt: users.emailVerificationRequiredAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (
      user
      && user.emailVerificationRequiredAt !== null
      && !user.emailVerifiedAt
    ) {
      await issueAndDeliverEmailVerification(user.id, user.email);
    }

    return genericEmailVerificationAcknowledgement(c);
  },
);

auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  const body = c.req.valid('json');
  const email = normalizeEmail(body.email);

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt,
      emailVerificationRequiredAt: users.emailVerificationRequiredAt,
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

  const result = await withAuthSessionTransaction<LoginSessionResult>(async (tx) => {
    const currentUser = await lockAuthUser(tx, user.id);
    // A credential change/deletion while the KDF ran invalidates the preflight.
    if (!currentUser || currentUser.passwordHash !== user.passwordHash) {
      return { ok: false, reason: 'invalid_credentials' as const };
    }

    if (requiresEmailVerification(currentUser)) {
      return { ok: false, reason: 'email_verification_required' as const };
    }

    const credential = issueRefreshCredential(currentUser.id);
    await tx.insert(authRefreshSessions).values(credential.session);
    return { ok: true, user: currentUser, credential } as const;
  });

  if (!result.ok) {
    if (result.reason === 'email_verification_required') {
      c.header('Cache-Control', 'no-store');
      return c.json({ error: 'Email verification required' }, 403);
    }
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const { credential } = result;
  const accessToken = await signAccessToken(result.user.id);

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
        const lockedUser = await lockAuthUser(tx, userId);
        return Boolean(lockedUser && !requiresEmailVerification(lockedUser));
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
    if (!session?.userId || !await lockAuthUser(tx, session.userId)) return;
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
