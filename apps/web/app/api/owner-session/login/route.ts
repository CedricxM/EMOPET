import { NextResponse } from 'next/server';

import { writeOwnerSessionCookies } from '../../../../lib/server/owner-session-cookies';
import { loginOwnerSession } from '../../../../lib/server/owner-session-provider';
import { evaluatePrivilegedMutationOrigin as evaluateOwnerSessionMutationOrigin } from '../../../../lib/server/privileged-mutation-origin';
import { resolvePrivilegedWebOrigin as resolveOwnerWebOrigin } from '../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../../lib/server/request-security';

export const runtime = 'nodejs';

const loginLimiter = createFixedWindowRateLimiter({
  limit: 10,
  windowMs: 60_000,
});
const MAX_BODY_BYTES = 4_096;

function privateJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function parseCredentials(value: unknown): { email: string; password: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'email' && key !== 'password')) {
    return null;
  }
  if (typeof record.email !== 'string' || typeof record.password !== 'string') {
    return null;
  }

  const email = record.email.trim();
  const password = record.password;
  if (
    email.length < 3
    || email.length > 320
    || /[\r\n\u0000]/.test(email)
    || password.length < 1
    || password.length > 1_024
    || /[\u0000]/.test(password)
  ) {
    return null;
  }

  return { email, password };
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, loginLimiter, 'owner-session:login');
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

  const body = await readLimitedJson<unknown>(req, MAX_BODY_BYTES);
  if (!body.ok) {
    return privateJson({ ok: false, error: body.error }, body.status);
  }

  const credentials = parseCredentials(body.data);
  if (!credentials) {
    return privateJson({ ok: false, error: 'invalid_credentials_payload' }, 400);
  }

  const result = await loginOwnerSession(credentials);
  if (result.status === 'UNAVAILABLE') {
    return privateJson({ ok: false, error: 'owner_auth_unavailable' }, 503);
  }
  if (result.status === 'DENIED') {
    if (result.reason === 'email_verification_required') {
      return privateJson({ ok: false, error: 'email_verification_required' }, 403);
    }
    return privateJson({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const response = privateJson({ ok: true, authenticated: true });
  writeOwnerSessionCookies(response, result.tokens);
  return response;
}
