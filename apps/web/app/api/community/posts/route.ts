/**
 * Publications de cercle — persistance SERVEUR (R3, tranche communauté).
 * GET  /api/community/posts[?circleId=]   liste (seed des posts démo si vide)
 * POST /api/community/posts               crée un post (validation + filtre modération)
 */

import { NextResponse } from 'next/server';
import { INITIAL_POSTS, buildPost, validatePostInput } from '../../../../lib/community';
import type { CirclePost, PostCreateInput } from '../../../../lib/community';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { cleanDisplayName, enforceRateLimit } from '../../../../lib/server/request-security';
import { collection } from '../../../../lib/server/store';

export const runtime = 'nodejs';

const posts = collection<CirclePost>('community-posts');
const postsReadLimiter = createFixedWindowRateLimiter({ limit: 90, windowMs: 60_000 });
const postsWriteLimiter = createFixedWindowRateLimiter({ limit: 20, windowMs: 60_000 });

function listSeeded(): CirclePost[] {
  let all = posts.list();
  if (all.length === 0) {
    for (const p of [...INITIAL_POSTS].reverse()) posts.insert(p);
    all = posts.list();
  }
  return all;
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, postsReadLimiter, 'community:posts:get');
  if (limited) return limited;

  const circleId = new URL(req.url).searchParams.get('circleId');
  const all = listSeeded().filter((p) => !p.isHidden);
  return NextResponse.json({ posts: circleId ? all.filter((p) => p.circleId === circleId) : all });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, postsWriteLimiter, 'community:posts:post');
  if (limited) return limited;

  let input: PostCreateInput;
  try {
    input = (await req.json()) as PostCreateInput;
  } catch {
    return NextResponse.json({ ok: false, errors: ['Requête invalide.'] }, { status: 400 });
  }
  const errors = validatePostInput(input);
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });
  listSeeded();
  const post = buildPost({ ...input, authorName: cleanDisplayName(input.authorName, 'Membre') });
  posts.insert(post);
  return NextResponse.json({ ok: true, post }, { status: 201 });
}
