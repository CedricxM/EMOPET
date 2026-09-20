/**
 * RÃ©ponse Ã  un post â€” persistance SERVEUR (R3). Filtre modÃ©ration appliquÃ©.
 * POST /api/community/posts/:id/replies
 */

import { NextResponse } from 'next/server';
import { buildReply, containsForbiddenContent } from '../../../../../../lib/community';
import type { CirclePost } from '../../../../../../lib/community';
import { createFixedWindowRateLimiter } from '../../../../../../lib/server/rate-limit';
import { cleanDisplayName, enforceRateLimit, readLimitedJson } from '../../../../../../lib/server/request-security';
import { collection } from '../../../../../../lib/server/store';

export const runtime = 'nodejs';

const posts = collection<CirclePost>('community-posts');
const repliesLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const REPLY_MAX_BODY_BYTES = 6 * 1024;
const REPLY_MAX_CONTENT_LENGTH = 1000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, repliesLimiter, 'community:replies:post');
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = await readLimitedJson<{ content?: string; authorName?: string }>(req, REPLY_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, { status: parsed.status });
  }
  const body = parsed.data;
  const content = (body.content ?? '').trim();
  if (content.length < 2) return NextResponse.json({ ok: false, errors: ['RÃ©ponse trop courte.'] }, { status: 400 });
  if (content.length > REPLY_MAX_CONTENT_LENGTH) return NextResponse.json({ ok: false, errors: ['Reponse trop volumineuse.'] }, { status: 400 });
  if (containsForbiddenContent(content).blocked) return NextResponse.json({ ok: false, errors: ['Contenu non autorisÃ© dÃ©tectÃ©.'] }, { status: 400 });

  const post = posts.list().find((p) => p.id === id);
  if (!post) return NextResponse.json({ ok: false, errors: ['Post introuvable.'] }, { status: 404 });
  if (post.isHidden) return NextResponse.json({ ok: false, errors: ['Post introuvable.'] }, { status: 404 });

  const reply = buildReply(content, cleanDisplayName(body.authorName, 'Membre'));
  posts.update(id, { replies: [...post.replies, reply] });
  return NextResponse.json({ ok: true, reply }, { status: 201 });
}
