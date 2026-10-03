import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  clearOwnerSessionCookies,
  writeOwnerSessionCookies,
} from '../../../../lib/server/owner-session-cookies';
import {
  OWNER_REFRESH_COOKIE,
} from '../../../../lib/server/owner-session-provider';
import { refreshOwnerSessionSingleFlight } from '../../../../lib/server/owner-session-singleflight';
import { evaluatePrivilegedMutationOrigin as evaluateOwnerSessionMutationOrigin } from '../../../../lib/server/privileged-mutation-origin';
import { resolvePrivilegedWebOrigin as resolveOwnerWebOrigin } from '../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';

const refreshLimiter = createFixedWindowRateLimiter({
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

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, refreshLimiter, 'owner-session:refresh');
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

  const refreshToken = (await cookies()).get(OWNER_REFRESH_COOKIE)?.value;
  const result = await refreshOwnerSessionSingleFlight(refreshToken);

  if (result.status === 'UNAVAILABLE') {
    return privateJson({ ok: false, error: 'owner_auth_unavailable' }, 503);
  }
  if (result.status !== 'AUTHENTICATED') {
    const response = privateJson({ ok: false, error: 'owner_session_required' }, 401);
    clearOwnerSessionCookies(response);
    return response;
  }

  const response = privateJson({ ok: true, refreshed: true });
  writeOwnerSessionCookies(response, result.tokens);
  return response;
}
