import { timingSafeEqual } from 'node:crypto';

/**
 * Gate admin minimal (server-only).
 *
 * Si `ADMIN_TOKEN` est défini, les routes admin exigent l'en-tête
 * `x-admin-token` correspondant. Sinon (dev), l'accès est ouvert localement.
 *
 * ⚠ Gate de prototype. La vraie protection = auth + rôle staff (RBAC),
 * différée jusqu'à la mise en place de l'authentification.
 */

export const ADMIN_TOKEN_COOKIE = 'breiz-admin-token';

export function adminConfigured(): boolean {
  return !!process.env['ADMIN_TOKEN'];
}

function decodeTokenValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export function isAdminTokenValue(value: string | null | undefined): boolean {
  const token = process.env['ADMIN_TOKEN']?.trim();
  const candidate = decodeTokenValue(value);
  if (!token || !candidate) return false;
  const tokenBytes = Buffer.from(token);
  const candidateBytes = Buffer.from(candidate);
  return tokenBytes.length === candidateBytes.length && timingSafeEqual(tokenBytes, candidateBytes);
}

export function isAdmin(req: Request): boolean {
  return isAdminTokenValue(req.headers.get('x-admin-token'));
}
