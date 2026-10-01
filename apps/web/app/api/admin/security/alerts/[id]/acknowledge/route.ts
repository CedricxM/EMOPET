import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { canonicalPrivilegedAuthorizationVerifier } from '../../../../../../../lib/server/canonical-privileged-verifier';
import { evaluatePrivilegedMutationOrigin } from '../../../../../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedSessionToken } from '../../../../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../../../../../lib/server/request-security';
import { emitSecurityAlertAcknowledgement } from '../../../../../../../lib/server/security-alert-ack-emitter';

export const runtime = 'nodejs';
const acknowledgementLimiter =
  createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const MAX_ACK_BODY_BYTES = 256;

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isEmptyObject(value: unknown): boolean {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.keys(value).length === 0;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(
    req,
    acknowledgementLimiter,
    'admin:security-alert:ack',
  );
  if (limited) return limited;

  const originConfig = resolvePrivilegedWebOrigin();
  if (originConfig.status !== 'CONFIGURED') {
    return json({ ok: false, error: 'privileged_origin_unavailable' }, 503);
  }
  const originDecision = evaluatePrivilegedMutationOrigin({
    request: req,
    expectedOrigin: originConfig.origin,
  });
  if (originDecision.status !== 'ALLOWED') {
    return json({ ok: false, error: 'forbidden_origin' }, 403);
  }

  // Browser mutations use the canonical HttpOnly privileged session only.
  // Caller-supplied Bearer identity is terminally rejected.
  if (req.headers.has('authorization')) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const sessionTokenValue =
    (await cookies()).get(PRIVILEGED_SESSION_COOKIE)?.value;
  const authorization = await authorizePrivilegedSessionToken(
    sessionTokenValue,
    'security.incident.coordinate',
    canonicalPrivilegedAuthorizationVerifier,
  );
  if (authorization.status === 'UNAVAILABLE') {
    return json({ ok: false, error: 'privileged_auth_unavailable' }, 503);
  }
  if (authorization.status !== 'AUTHORIZED') {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const body = await readLimitedJson<unknown>(req, MAX_ACK_BODY_BYTES);
  if (!body.ok || !isEmptyObject(body.data)) {
    // Identity, role, timestamps, messages and any other caller material are
    // deliberately rejected. The server supplies authority and time.
    return json({ ok: false, error: 'invalid_acknowledgement' }, body.ok ? 400 : body.status);
  }

  const { id } = await ctx.params;
  const result = await emitSecurityAlertAcknowledgement({
    authorization,
    alertId: id,
    acknowledgedAt: new Date().toISOString(),
  });

  if (result.status === 'ACKNOWLEDGED') {
    return json({ ok: true, duplicate: result.duplicate }, result.duplicate ? 200 : 201);
  }
  if (result.status === 'NOT_FOUND') {
    return json({ ok: false, error: 'alert_not_found' }, 404);
  }
  if (result.status === 'CONFLICT') {
    return json({ ok: false, error: 'acknowledgement_conflict' }, 409);
  }
  if (result.status === 'INVALID_ALERT') {
    return json({ ok: false, error: 'invalid_acknowledgement' }, 400);
  }
  return json({ ok: false, error: 'acknowledgement_unavailable' }, 503);
}
