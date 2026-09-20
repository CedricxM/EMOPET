/**
 * Legacy mixed moderation queue.
 *
 * This route reads the historical file-backed Contact collection. It is
 * therefore available only under the explicit non-production Contact demo
 * opt-in. Community-specific containment remains governed separately.
 */

import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../lib/contact';
import type { CirclePost } from '../../../../lib/community';
import { collection } from '../../../../lib/server/store';
import { adminConfigured, isAdmin } from '../../../../lib/server/admin';
import { legacyContactAuthorityGate } from '../../../../lib/server/contact-authority';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

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
  const contactAuthorityGate = legacyContactAuthorityGate();
  if (contactAuthorityGate) return contactAuthorityGate;

  const limited = enforceRateLimit(req, adminLimiter, 'admin:moderation:get');
  if (limited) return limited;

  if (!isAdmin(req)) return demoJson({ ok: false, error: 'unauthorized' }, 401);
  const contactRequests = collection<ContactRequest>('contact-requests').list();
  const posts = collection<CirclePost>('community-posts').list();
  const flaggedPosts = posts.filter((p) => p.flagCount > 0 || p.isHidden);
  return demoJson({
    ok: true,
    adminConfigured: adminConfigured(),
    contactRequests,
    flaggedPosts,
  });
}
