/**
 * Legacy Community moderation plane.
 *
 * Product V1 authority is Hono + durable persistence. This historical Next.js
 * JSON-store route is disabled by default and may run only in an explicit
 * non-production demo using EMOPET_ALLOW_LEGACY_COMMUNITY_DEMO=1.
 */

import { NextResponse } from 'next/server';
import type { CirclePost } from '../../../../../../lib/community';
import { legacyCommunityAuthorityGate } from '../../../../../../lib/server/community-authority';
import { createFixedWindowRateLimiter } from '../../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../../lib/server/request-security';
import { collection } from '../../../../../../lib/server/store';

export const runtime = 'nodejs';

const posts = collection<CirclePost>('community-posts');
const flagLimiter = createFixedWindowRateLimiter({ limit: 15, windowMs: 60_000 });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authorityGate = legacyCommunityAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, flagLimiter, 'community:flag:post');
  if (limited) return limited;

  const { id } = await ctx.params;
  const post = posts.list().find((p) => p.id === id);
  if (!post) return NextResponse.json({ ok: false, errors: ['Post introuvable.'] }, { status: 404 });

  const flagCount = Math.min(post.flagCount + 1, 999);
  posts.update(id, { flagCount, isHidden: post.isHidden });
  return NextResponse.json({ ok: true, flagCount, isHidden: post.isHidden, needsModeration: true });
}
