import { randomUUID } from 'node:crypto';

import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from './auth-security.js';

export type SessionRevokeReason = 'logout' | 'logout_all' | 'rotated' | 'reuse_detected' | 'expired';

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
}

export interface NewRefreshSession {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshSessionRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshSessionRecord | null>;
  lockFamily(familyId: string): Promise<void>;
  revokeIfActive(id: string, reason: SessionRevokeReason, at: Date): Promise<boolean>;
  revokeActiveFamily(familyId: string, reason: SessionRevokeReason, at: Date): Promise<void>;
  insert(session: NewRefreshSession): Promise<void>;
}

export interface IssuedRefreshCredential {
  rawToken: string;
  session: NewRefreshSession;
}

export function issueRefreshCredential(
  userId: string,
  now = new Date(),
  familyId: string = randomUUID(),
): IssuedRefreshCredential {
  const rawToken = generateRefreshToken();
  return {
    rawToken,
    session: {
      userId,
      familyId,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: refreshTokenExpiresAt(now),
    },
  };
}

export type RotateRefreshResult =
  | { ok: true; userId: string; credential: IssuedRefreshCredential }
  | { ok: false; reason: 'invalid_or_expired' | 'reuse_detected' };

/**
 * Consume one refresh token and rotate it exactly once.
 *
 * The caller must bind the repository to one database transaction. Rotation is
 * serialized by refresh-token family, then the token is re-read after the lock
 * so a state observed before waiting cannot be used to issue a new credential.
 * Raw refresh tokens are never persisted or supplied to the repository.
 */
export async function rotateRefreshCredential(
  repository: RefreshSessionRepository,
  rawToken: string,
  now = new Date(),
): Promise<RotateRefreshResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const observed = await repository.findByTokenHash(tokenHash);
  if (!observed) return { ok: false, reason: 'invalid_or_expired' };

  await repository.lockFamily(observed.familyId);

  const current = await repository.findByTokenHash(tokenHash);
  if (!current || current.familyId !== observed.familyId) {
    return { ok: false, reason: 'invalid_or_expired' };
  }

  if (current.revokedAt) {
    if (current.revokeReason === 'rotated') {
      await repository.revokeActiveFamily(current.familyId, 'reuse_detected', now);
      return { ok: false, reason: 'reuse_detected' };
    }
    return { ok: false, reason: 'invalid_or_expired' };
  }

  if (current.expiresAt.getTime() <= now.getTime()) {
    await repository.revokeIfActive(current.id, 'expired', now);
    return { ok: false, reason: 'invalid_or_expired' };
  }

  const consumed = await repository.revokeIfActive(current.id, 'rotated', now);
  if (!consumed) {
    await repository.revokeActiveFamily(current.familyId, 'reuse_detected', now);
    return { ok: false, reason: 'reuse_detected' };
  }

  const credential = issueRefreshCredential(current.userId, now, current.familyId);
  await repository.insert(credential.session);

  return { ok: true, userId: current.userId, credential };
}
