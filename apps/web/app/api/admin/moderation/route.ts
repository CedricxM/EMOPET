/**
 * File de modération admin (équipe) — lecture seule.
 * GET /api/admin/moderation → demandes de contact + posts signalés.
 * Gate : x-admin-token == ADMIN_TOKEN. Fermé si ADMIN_TOKEN n'est pas configuré.
 */

import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../lib/contact';
import type { CirclePost } from '../../../../lib/community';
import { collection } from '../../../../lib/server/store';
import { adminConfigured, isAdmin } from '../../../../lib/server/admin';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, adminLimiter, 'admin:moderation:get');
  if (limited) return limited;

  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const contactRequests = collection<ContactRequest>('contact-requests').list();
  const posts = collection<CirclePost>('community-posts').list();
  const flaggedPosts = posts.filter((p) => p.flagCount > 0 || p.isHidden);
  return NextResponse.json({
    ok: true,
    adminConfigured: adminConfigured(),
    contactRequests,
    flaggedPosts,
  });
}
