import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  clearOwnerAccessCookie,
} from '../../../../lib/server/owner-session-cookies';
import {
  OWNER_ACCESS_COOKIE,
} from '../../../../lib/server/owner-session-provider';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../lib/server/request-security';
import { readWorldGamificationForOwnerSession } from '../../../../lib/server/world-gamification-owner-session';

export const runtime = 'nodejs';

const readLimiter = createFixedWindowRateLimiter({
  limit: 120,
  windowMs: 60_000,
});

function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    },
  });
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, readLimiter, 'world-gamification:owner-read');
  if (limited) return limited;

  if (req.headers.has('authorization')) {
    return privateJson({ ok: false, error: 'unexpected_authorization' }, 400);
  }

  const url = new URL(req.url);
  const keys = [...url.searchParams.keys()];
  if (keys.some((key) => key !== 'region') || url.searchParams.getAll('region').length > 1) {
    return privateJson({ ok: false, error: 'invalid_query' }, 400);
  }

  const store = await cookies();
  const result = await readWorldGamificationForOwnerSession({
    accessToken: store.get(OWNER_ACCESS_COOKIE)?.value,
    regionCode: url.searchParams.get('region'),
  });

  if (result.status === 'DENIED') {
    const response = privateJson({ ok: false, error: 'owner_access_refresh_required' }, 401);
    clearOwnerAccessCookie(response);
    return response;
  }
  if (result.status !== 'OK') {
    return privateJson({ ok: false, error: 'world_gamification_unavailable' }, 503);
  }

  return privateJson(result.snapshot);
}
