import { timingSafeEqual } from 'node:crypto';

/**
 * Legacy prototype admin gate (server-only).
 *
 * This shared static token is intentionally unavailable in production. It has
 * no individual staff identity, MFA assurance, role separation or per-user
 * revocation, so it must not become a production privileged authority while
 * the real authenticated staff path is still being built.
 *
 * In non-production environments only, `ADMIN_TOKEN` may keep the prototype
 * admin tooling usable for local development and tests.
 */

export const ADMIN_TOKEN_COOKIE = 'breiz-admin-token';

function legacyAdminTokenAllowed(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

export function adminConfigured(): boolean {
  return legacyAdminTokenAllowed() && !!process.env['ADMIN_TOKEN']?.trim();
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
  if (!legacyAdminTokenAllowed()) return false;

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
