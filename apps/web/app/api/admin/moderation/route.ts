/**
 * File de modération privilégiée — lecture seule.
 * GET /api/admin/moderation → demandes de contact + posts signalés.
 *
 * Production remains fail-closed until the canonical privileged-token verifier
 * selected by #177 is connected. The legacy static-token gate is not an authority here.
 */

import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../lib/contact';
import type { CirclePost } from '../../../../lib/community';
import {
  authorizePrivilegedRequest,
  unavailablePrivilegedAuthorizationVerifier,
} from '../../../../lib/server/privileged-request';
import { collection } from '../../../../lib/server/store';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, adminLimiter, 'admin:moderation:get');
  if (limited) return limited;

  const authorization = await authorizePrivilegedRequest(
    req,
    'moderation.queue.read',
    unavailablePrivilegedAuthorizationVerifier,
  );

  if (authorization.status === 'UNAVAILABLE') {
    return NextResponse.json(
      { ok: false, error: 'privileged_auth_unavailable' },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
  if (authorization.status !== 'AUTHORIZED') {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const contactRequests = collection<ContactRequest>('contact-requests').list();
  const posts = collection<CirclePost>('community-posts').list();
  const flaggedPosts = posts.filter((p) => p.flagCount > 0 || p.isHidden);

  return NextResponse.json(
    {
      ok: true,
      contactRequests,
      flaggedPosts,
    },
    { headers: PRIVATE_NO_STORE },
  );
}
