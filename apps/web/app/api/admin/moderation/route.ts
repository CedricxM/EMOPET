/**
 * Legacy mixed moderation queue.
 *
 * This route joins historical file-backed Contact and Community collections.
 * It is therefore available only when both explicit non-production demo planes
 * are enabled. It is not Product V1 moderation authority.
 */

import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../lib/contact';
import type { CirclePost } from '../../../../lib/community';
import { collection } from '../../../../lib/server/store';
import { adminConfigured, isAdmin } from '../../../../lib/server/admin';
import { legacyCommunityAuthorityGate } from '../../../../lib/server/community-authority';
import { legacyContactAuthorityGate } from '../../../../lib/server/contact-authority';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(req: Request) {
  const communityAuthorityGate = legacyCommunityAuthorityGate();
  if (communityAuthorityGate) return communityAuthorityGate;
  const contactAuthorityGate = legacyContactAuthorityGate();
  if (contactAuthorityGate) return contactAuthorityGate;

  const limited = enforceRateLimit(req, adminLimiter, 'admin:moderation:get');
  if (limited) return limited;

  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', authority: 'LEGACY_DEMO_ONLY' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } },
    );
  }
  const contactRequests = collection<ContactRequest>('contact-requests').list();
  const posts = collection<CirclePost>('community-posts').list();
  const flaggedPosts = posts.filter((p) => p.flagCount > 0 || p.isHidden);
  return NextResponse.json(
    {
      ok: true,
      authority: 'LEGACY_DEMO_ONLY',
      adminConfigured: adminConfigured(),
      contactRequests,
      flaggedPosts,
    },
    { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}
