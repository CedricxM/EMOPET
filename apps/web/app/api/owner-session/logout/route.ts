import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  clearOwnerAccessCookie,
  clearOwnerSessionCookies,
} from '../../../../lib/server/owner-session-cookies';
import {
  logoutOwnerSession,
  OWNER_REFRESH_COOKIE,
} from '../../../../lib/server/owner-session-provider';
import { evaluatePrivilegedMutationOrigin as evaluateOwnerSessionMutationOrigin } from '../../../../lib/server/privileged-mutation-origin';
import { resolvePrivilegedWebOrigin as resolveOwnerWebOrigin } from '../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';

const logoutLimiter = createFixedWindowRateLimiter({
  limit: 30,
  windowMs: 60_000,
});

function privateJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function cleared(body: Record<string, unknown>, status: number): NextResponse {
  const response = privateJson(body, status);
  clearOwnerSessionCookies(response);
  return response;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, logoutLimiter, 'owner-session:logout');
  if (limited) return limited;

  if (req.headers.has('authorization')) {
    return privateJson({ ok: false, error: 'unexpected_authorization' }, 400);
  }

  const originConfig = resolveOwnerWebOrigin();
  if (originConfig.status !== 'CONFIGURED') {
    return privateJson({ ok: false, error: 'owner_session_origin_unavailable' }, 503);
  }

  const originDecision = evaluateOwnerSessionMutationOrigin({
    request: req,
    expectedOrigin: originConfig.origin,
  });
  if (originDecision.status !== 'ALLOWED') {
    return privateJson({ ok: false, error: 'forbidden_origin' }, 403);
  }

  const rawContentLength = req.headers.get('content-length');
  if (rawContentLength !== null && Number(rawContentLength) > 0) {
    return privateJson({ ok: false, error: 'request_body_not_allowed' }, 400);
  }

  const refreshToken = (await cookies()).get(OWNER_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return cleared({ ok: true, loggedOut: true }, 200);
  }

  const result = await logoutOwnerSession(refreshToken);
  if (result === 'UNAVAILABLE') {
    const response = privateJson({ ok: false, error: 'logout_unavailable' }, 503);
    clearOwnerAccessCookie(response);
    return response;
  }

  return cleared({ ok: true, loggedOut: true }, 200);
}
