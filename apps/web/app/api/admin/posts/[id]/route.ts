/**
 * Modération admin d'un post signalé.
 * PATCH /api/admin/posts/:id  body { action: 'hide' | 'unhide' | 'dismiss' }
 *   hide    → masque le post
 *   unhide  → ré-affiche le post
 *   dismiss → rejette les signalements (flagCount=0, ré-affiche)
 */

import { NextResponse } from 'next/server';
import type { CirclePost } from '../../../../../lib/community';
import { collection } from '../../../../../lib/server/store';
import { isAdmin } from '../../../../../lib/server/admin';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, adminLimiter, 'admin:posts:patch');
  if (limited) return limited;

  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  let body: { action?: 'hide' | 'unhide' | 'dismiss' };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errors: ['Requête invalide.'] }, { status: 400 });
  }
  const patch: Partial<CirclePost> =
    body.action === 'hide' ? { isHidden: true }
      : body.action === 'unhide' ? { isHidden: false }
        : body.action === 'dismiss' ? { isHidden: false, flagCount: 0 }
          : {};
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, errors: ['Action invalide.'] }, { status: 400 });
  const updated = collection<CirclePost>('community-posts').update(id, patch);
  if (!updated) return NextResponse.json({ ok: false, errors: ['Post introuvable.'] }, { status: 404 });
  return NextResponse.json({ ok: true, post: updated });
}
