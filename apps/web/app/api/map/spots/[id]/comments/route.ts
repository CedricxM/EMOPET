/**
 * Commentaires d'un spot — persistance SERVEUR (R3).
 * POST /api/map/spots/:id/comments   ajoute un commentaire (5-500 caractères).
 */

import { NextResponse } from 'next/server';
import type { CommunitySpot, SpotComment } from '../../../../../../components/bretagne-map/spots';
import { containsForbiddenContent } from '../../../../../../lib/community';
import { createFixedWindowRateLimiter } from '../../../../../../lib/server/rate-limit';
import { cleanDisplayName, enforceRateLimit, readLimitedJson } from '../../../../../../lib/server/request-security';
import { collection } from '../../../../../../lib/server/store';

export const runtime = 'nodejs';

const spots = collection<CommunitySpot>('map-spots');
const commentLimiter = createFixedWindowRateLimiter({ limit: 20, windowMs: 60_000 });
const COMMENT_MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, commentLimiter, 'map:spots:comments');
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = await readLimitedJson<{ content?: string; rating?: number; authorName?: string }>(req, COMMENT_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, { status: parsed.status });
  }
  const body = parsed.data;
  const content = (body.content ?? '').trim();
  if (content.length < 5 || content.length > 500) {
    return NextResponse.json({ ok: false, errors: ['Le commentaire doit faire 5 à 500 caractères.'] }, { status: 400 });
  }
  if (containsForbiddenContent(content).blocked) return NextResponse.json({ ok: false, errors: ['Contenu non autorise detecte.'] }, { status: 400 });
  if (body.rating != null && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
    return NextResponse.json({ ok: false, errors: ['Note invalide.'] }, { status: 400 });
  }
  const spot = spots.list().find((s) => s.id === id);
  if (!spot) return NextResponse.json({ ok: false, errors: ['Spot introuvable.'] }, { status: 404 });

  const comment: SpotComment = {
    id: `c-${Date.now()}`,
    content,
    rating: typeof body.rating === 'number' ? body.rating : undefined,
    authorName: cleanDisplayName(body.authorName, 'Anonyme'),
    createdAt: new Date().toISOString(),
  };
  spots.update(id, { comments: [...spot.comments, comment] });
  return NextResponse.json({ ok: true, comment }, { status: 201 });
}
