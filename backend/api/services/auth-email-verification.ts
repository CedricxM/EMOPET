import { createHash, randomBytes } from 'node:crypto';

import {
  and,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
} from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  authEmailVerificationTokens,
  users,
} from '../../db/schema/index.js';
import { hashPassword, normalizeEmail } from './auth-security.js';

export const EMAIL_VERIFICATION_TOKEN_TTL_SECONDS = 24 * 60 * 60;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_VERIFICATION_TOKEN_PREFIX = 'emopet_ev_';

const RAW_TOKEN_RE = /^emopet_ev_[A-Za-z0-9_-]{43}$/;

export type IssueEmailVerificationResult =
  | {
      ok: true;
      rawToken: string;
      expiresAt: Date;
    }
  | {
      ok: false;
      reason:
        | 'user_not_found'
        | 'email_mismatch'
        | 'already_verified'
        | 'verification_not_required'
        | 'cooldown';
    };

export function generateEmailVerificationToken(): string {
  return `${EMAIL_VERIFICATION_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashEmailVerificationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function isCanonicalEmailVerificationToken(rawToken: unknown): rawToken is string {
  return typeof rawToken === 'string' && RAW_TOKEN_RE.test(rawToken);
}

export function emailVerificationTokenExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_SECONDS * 1_000);
}

/**
 * Issue one verification token for one canonical user/email pair.
 *
 * The user row is locked first, so concurrent resend/registration attempts
 * cannot leave more than one live token. A new token supersedes any previous
 * unconsumed/unrevoked token after the 60-second cooldown.
 *
 * The raw token exists only in the return value. PostgreSQL receives SHA-256.
 */
export async function issueEmailVerificationToken(
  userId: string,
  emailInput: string,
  clock: () => Date = () => new Date(),
): Promise<IssueEmailVerificationResult> {
  const email = normalizeEmail(emailInput);
  const now = clock();

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({
        id: users.id,
        email: users.email,
        emailVerifiedAt: users.emailVerifiedAt,
        emailVerificationRequiredAt: users.emailVerificationRequiredAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for('update');

    if (!user) return { ok: false, reason: 'user_not_found' };
    if (user.email !== email) return { ok: false, reason: 'email_mismatch' };
    if (user.emailVerifiedAt) return { ok: false, reason: 'already_verified' };
    if (user.emailVerificationRequiredAt == null) {
      return { ok: false, reason: 'verification_not_required' };
    }

    const [current] = await tx
      .select({
        createdAt: authEmailVerificationTokens.createdAt,
      })
      .from(authEmailVerificationTokens)
      .where(and(
        eq(authEmailVerificationTokens.userId, user.id),
        isNull(authEmailVerificationTokens.consumedAt),
        isNull(authEmailVerificationTokens.revokedAt),
      ))
      .orderBy(desc(authEmailVerificationTokens.createdAt))
      .limit(1);

    if (
      current
      && now.getTime() < current.createdAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1_000
    ) {
      return { ok: false, reason: 'cooldown' };
    }

    await tx
      .update(authEmailVerificationTokens)
      .set({
        revokedAt: now,
        revokeReason: 'superseded',
      })
      .where(and(
        eq(authEmailVerificationTokens.userId, user.id),
        isNull(authEmailVerificationTokens.consumedAt),
        isNull(authEmailVerificationTokens.revokedAt),
      ));

    const rawToken = generateEmailVerificationToken();
    const expiresAt = emailVerificationTokenExpiresAt(now);

    await tx.insert(authEmailVerificationTokens).values({
      userId: user.id,
      email,
      tokenHash: hashEmailVerificationToken(rawToken),
      expiresAt,
      consumedAt: null,
      revokedAt: null,
      revokeReason: null,
      createdAt: now,
    });

    return { ok: true, rawToken, expiresAt };
  });
}

/**
 * Consume a token exactly once, prove ownership of the same current email and
 * atomically replace the provisional registration password with the password
 * supplied by the email owner.
 *
 * This prevents registration pre-hijacking: possession of the email token does
 * not promote a password selected before email ownership was proven.
 *
 * The token UPDATE is conditional on unconsumed + unrevoked + unexpired state,
 * so concurrent callers get at most one winner. If the user's email changed or
 * the account is outside the explicit verification-required cohort, the token
 * is consumed but cannot promote account authority.
 */
export async function consumeEmailVerificationToken(
  rawToken: string,
  verificationPassword: string,
  clock: () => Date = () => new Date(),
): Promise<boolean> {
  if (!isCanonicalEmailVerificationToken(rawToken)) return false;

  // KDF stays outside the short database transaction.
  const passwordHash = await hashPassword(verificationPassword);
  const now = clock();
  const tokenHash = hashEmailVerificationToken(rawToken);

  return db.transaction(async (tx) => {
    const consumed = await tx
      .update(authEmailVerificationTokens)
      .set({ consumedAt: now })
      .where(and(
        eq(authEmailVerificationTokens.tokenHash, tokenHash),
        isNull(authEmailVerificationTokens.consumedAt),
        isNull(authEmailVerificationTokens.revokedAt),
        gt(authEmailVerificationTokens.expiresAt, now),
      ))
      .returning({
        userId: authEmailVerificationTokens.userId,
        email: authEmailVerificationTokens.email,
      });

    const [consumedToken] = consumed;
    if (!consumedToken) return false;

    const [verified] = await tx
      .update(users)
      .set({
        passwordHash,
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(users.id, consumedToken.userId),
        eq(users.email, consumedToken.email),
        isNotNull(users.emailVerificationRequiredAt),
        isNull(users.emailVerifiedAt),
      ))
      .returning({ id: users.id });

    return Boolean(verified);
  });
}
