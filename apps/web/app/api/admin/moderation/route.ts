/**
 * Legacy mixed moderation queue.
 *
 * The underlying Contact and Community collections remain historical
 * file-backed demo planes. Their kill gates stay authoritative and execute
 * before privileged authorization. D2-A changes only the staff authority.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../lib/contact';
import type { CirclePost } from '../../../../lib/community';
import { canonicalPrivilegedAuthorizationVerifier } from '../../../../lib/server/canonical-privileged-verifier';
import { legacyCommunityAuthorityGate } from '../../../../lib/server/community-authority';
import { legacyContactAuthorityGate } from '../../../../lib/server/contact-authority';
import { authorizePrivilegedRequestOrSession } from '../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../lib/server/privileged-session';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';
import { collection } from '../../../../lib/server/store';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

function demoJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(
    { ...body, authority: 'LEGACY_DEMO_ONLY' },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}

export async function GET(req: Request) {
  const communityAuthorityGate = legacyCommunityAuthorityGate();
  if (communityAuthorityGate) return communityAuthorityGate;
  const contactAuthorityGate = legacyContactAuthorityGate();
  if (contactAuthorityGate) return contactAuthorityGate;

  const limited = enforceRateLimit(req, adminLimiter, 'admin:moderation:get');
  if (limited) return limited;

  const sessionTokenValue = req.headers.has('authorization')
    ? undefined
    : (await cookies()).get(PRIVILEGED_SESSION_COOKIE)?.value;

  const authorization = await authorizePrivilegedRequestOrSession(
    req,
    sessionTokenValue,
    'moderation.queue.read',
    canonicalPrivilegedAuthorizationVerifier,
  );

  if (authorization.status === 'UNAVAILABLE') {
    return demoJson({ ok: false, error: 'privileged_auth_unavailable' }, 503);
  }
  if (authorization.status !== 'AUTHORIZED') {
    return demoJson({ ok: false, error: 'unauthorized' }, 401);
  }

  const contactRequests = collection<ContactRequest>('contact-requests').list();
  const posts = collection<CirclePost>('community-posts').list();
  const flaggedPosts = posts.filter((p) => p.flagCount > 0 || p.isHidden);

  return demoJson({ ok: true, contactRequests, flaggedPosts });
}
