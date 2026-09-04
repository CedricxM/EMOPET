import { parsePrivilegedWebOrigin } from './privileged-mutation-origin';

export type PrivilegedWebOriginConfig =
  | { status: 'CONFIGURED'; origin: string }
  | { status: 'UNAVAILABLE'; reason: 'missing_origin' | 'invalid_origin' };

/**
 * Resolve the single configured browser origin used by privileged mutation
 * checks. Unlike the backend's general development CORS behavior, this helper
 * never falls back to `*` or localhost: privileged mutations remain unavailable
 * until an exact canonical origin is configured.
 */
export function resolvePrivilegedWebOrigin(
  value: unknown = process.env['CORS_ORIGIN'],
): PrivilegedWebOriginConfig {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { status: 'UNAVAILABLE', reason: 'missing_origin' };
  }

  const configured = value.trim();
  const canonical = parsePrivilegedWebOrigin(configured);
  if (!canonical || canonical !== configured) {
    return { status: 'UNAVAILABLE', reason: 'invalid_origin' };
  }

  return { status: 'CONFIGURED', origin: canonical };
}
