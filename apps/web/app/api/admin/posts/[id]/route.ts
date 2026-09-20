/**
 * Legacy admin moderation for historical file-backed Community posts.
 *
 * Product V1 Community moderation is not implemented by this route. The
 * historical JSON mutation is disabled by default and may run only under the
 * explicit non-production Community demo opt-in.
 */

import { NextResponse } from 'next/server';
import type { CirclePost } from '../../../../../lib/community';
import { collection } from '../../../../../lib/server/store';
import { isAdmin } from '../../../../../lib/server/admin';
import { legacyCommunityAuthorityGate } from '../../../../../lib/server/community-authority';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../lib/server/request-security';

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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authorityGate = legacyCommunityAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, adminLimiter, 'admin:posts:patch');
  if (limited) return limited;

  if (!isAdmin(req)) return demoJson({ ok: false, error: 'unauthorized' }, 401);
  const { id } = await ctx.params;
  let body: { action?: 'hide' | 'unhide' | 'dismiss' };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return demoJson({ ok: false, errors: ['Requête invalide.'] }, 400);
  }
  const patch: Partial<CirclePost> =
    body.action === 'hide' ? { isHidden: true }
      : body.action === 'unhide' ? { isHidden: false }
        : body.action === 'dismiss' ? { isHidden: false, flagCount: 0 }
          : {};
  if (Object.keys(patch).length === 0) return demoJson({ ok: false, errors: ['Action invalide.'] }, 400);
  const updated = collection<CirclePost>('community-posts').update(id, patch);
  if (!updated) return demoJson({ ok: false, errors: ['Post introuvable.'] }, 404);
  return demoJson({ ok: true, post: updated });
}
