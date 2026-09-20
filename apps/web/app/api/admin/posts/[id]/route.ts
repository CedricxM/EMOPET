/**
 * Legacy admin moderation for historical file-backed Community posts.
 *
 * Product V1 Community moderation is not implemented by this route. The
 * historical JSON mutation is disabled by default and may run only under the
 * explicit non-production Community demo opt-in.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CirclePost } from '../../../../../lib/community';
import { collection } from '../../../../../lib/server/store';
import { canonicalPrivilegedAuthorizationVerifier } from '../../../../../lib/server/canonical-privileged-verifier';
import { legacyCommunityAuthorityGate } from '../../../../../lib/server/community-authority';
import { evaluatePrivilegedMutationOrigin } from '../../../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedSessionToken } from '../../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const MAX_ADMIN_POST_PATCH_BYTES = 8 * 1024;
const ADMIN_POST_ACTIONS = new Set(['hide', 'unhide', 'dismiss'] as const);

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

  const originConfig = resolvePrivilegedWebOrigin();
  if (originConfig.status !== 'CONFIGURED') {
    return demoJson({ ok: false, error: 'privileged_origin_unavailable' }, 503);
  }

  const originDecision = evaluatePrivilegedMutationOrigin({
    request: req,
    expectedOrigin: originConfig.origin,
  });
  if (originDecision.status !== 'ALLOWED') {
    return demoJson({ ok: false, error: 'forbidden_origin' }, 403);
  }

  if (req.headers.has('authorization')) {
    return demoJson({ ok: false, error: 'unauthorized' }, 401);
  }

  const sessionTokenValue = (await cookies()).get(PRIVILEGED_SESSION_COOKIE)?.value;
  const authorization = await authorizePrivilegedSessionToken(
    sessionTokenValue,
    'moderation.post.manage',
    canonicalPrivilegedAuthorizationVerifier,
  );

  if (authorization.status === 'UNAVAILABLE') {
    return demoJson({ ok: false, error: 'privileged_auth_unavailable' }, 503);
  }
  if (authorization.status !== 'AUTHORIZED') {
    return demoJson({ ok: false, error: 'unauthorized' }, 401);
  }

  const { id } = await ctx.params;
  const parsed = await readLimitedJson<unknown>(req, MAX_ADMIN_POST_PATCH_BYTES);
  if (!parsed.ok) {
    return demoJson(
      { ok: false, errors: [parsed.status === 413 ? 'Requête trop volumineuse.' : 'Requête invalide.'] },
      parsed.status,
    );
  }

  const body = parsed.data;
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return demoJson({ ok: false, errors: ['Requête invalide.'] }, 400);
  }

  const action = (body as Record<string, unknown>)['action'];
  if (typeof action !== 'string' || !ADMIN_POST_ACTIONS.has(action as 'hide' | 'unhide' | 'dismiss')) {
    return demoJson({ ok: false, errors: ['Action invalide.'] }, 400);
  }

  const patch: Partial<CirclePost> =
    action === 'hide' ? { isHidden: true }
      : action === 'unhide' ? { isHidden: false }
        : { isHidden: false, flagCount: 0 };
  const updated = collection<CirclePost>('community-posts').update(id, patch);
  if (!updated) return demoJson({ ok: false, errors: ['Post introuvable.'] }, 404);
  return demoJson({ ok: true, post: updated });
}
