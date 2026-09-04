import {
  authorizePrivilegedRequest,
  type PrivilegedAuthorizationVerifier,
  type PrivilegedRequestDecision,
} from './privileged-request';

export type ContactReadAuthorityDecision =
  | { status: 'OWNER_SCOPE' }
  | PrivilegedRequestDecision;

/**
 * GET /api/contact has two intentionally separate authorities:
 * - no Authorization header: preserve the existing owner-token path;
 * - Authorization header present: it is a privileged attempt and must terminate
 *   as authorized, denied or unavailable. It must never fall through to owner scope.
 */
export async function resolveContactReadAuthority(
  req: Request,
  verifier: PrivilegedAuthorizationVerifier,
): Promise<ContactReadAuthorityDecision> {
  if (!req.headers.has('authorization')) {
    return { status: 'OWNER_SCOPE' };
  }

  return authorizePrivilegedRequest(req, 'contact.request.read', verifier);
}
