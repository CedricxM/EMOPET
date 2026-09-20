/**
 * Legacy community-map comments prototype.
 *
 * Historical JSON persistence is disabled by default and may run only under
 * the explicit non-production Community demo opt-in.
 */

import { NextResponse } from 'next/server';
import type { CommunitySpot, SpotComment } from '../../../../../../components/bretagne-map/spots';
import { containsForbiddenContent } from '../../../../../../lib/community';
import { legacyCommunityAuthorityGate } from '../../../../../../lib/server/community-authority';
import { createFixedWindowRateLimiter } from '../../../../../../lib/server/rate-limit';
import { cleanDisplayName, enforceRateLimit, readLimitedJson } from '../../../../../../lib/server/request-security';
import { collection } from '../../../../../../lib/server/store';

export const runtime = 'nodejs';

const spots = collection<CommunitySpot>('map-spots');
const commentLimiter = createFixedWindowRateLimiter({ limit: 20, windowMs: 60_000 });
const COMMENT_MAX_BODY_BYTES = 8 * 1024;

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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authorityGate = legacyCommunityAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, commentLimiter, 'map:spots:comments');
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = await readLimitedJson<{ content?: string; rating?: number; authorName?: string }>(req, COMMENT_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return demoJson({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, parsed.status);
  }
  const body = parsed.data;
  const content = (body.content ?? '').trim();
  if (content.length < 5 || content.length > 500) {
    return demoJson({ ok: false, errors: ['Le commentaire doit faire 5 à 500 caractères.'] }, 400);
  }
  if (containsForbiddenContent(content).blocked) return demoJson({ ok: false, errors: ['Contenu non autorise detecte.'] }, 400);
  if (body.rating != null && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
    return demoJson({ ok: false, errors: ['Note invalide.'] }, 400);
  }
  const spot = spots.list().find((s) => s.id === id);
  if (!spot) return demoJson({ ok: false, errors: ['Spot introuvable.'] }, 404);

  const comment: SpotComment = {
    id: `c-${Date.now()}`,
    content,
    rating: typeof body.rating === 'number' ? body.rating : undefined,
    authorName: cleanDisplayName(body.authorName, 'Anonyme'),
    createdAt: new Date().toISOString(),
  };
  spots.update(id, { comments: [...spot.comments, comment] });
  return demoJson({ ok: true, comment }, 201);
}
