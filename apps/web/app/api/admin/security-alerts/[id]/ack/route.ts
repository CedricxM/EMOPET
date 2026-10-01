import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { canonicalPrivilegedAuthorizationVerifier } from '../../../../../../lib/server/canonical-privileged-verifier';
import { evaluatePrivilegedMutationOrigin } from '../../../../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedRequestOrSession } from '../../../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../../lib/server/request-security';
import { emitSecurityAlertAcknowledgement } from '../../../../../../lib/server/security-alert-ack-emitter';

export const runtime = 'nodejs';

const ackLimiter = createFixedWindowRateLimiter({
  limit: 30,
  windowMs: 60_000,
});
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 1024;

function privateJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = enforceRateLimit(req, ackLimiter, 'security-alert:ack');
  if (limited) return limited;

  const usesBearer = req.headers.has('authorization');
  if (!usesBearer) {
    const originConfig = resolvePrivilegedWebOrigin();
    if (originConfig.status !== 'CONFIGURED') {
      return privateJson(
        { ok: false, error: 'privileged_origin_unavailable' },
        503,
      );
    }
    const originDecision = evaluatePrivilegedMutationOrigin({
      request: req,
      expectedOrigin: originConfig.origin,
    });
    if (originDecision.status !== 'ALLOWED') {
      return privateJson({ ok: false, error: 'forbidden_origin' }, 403);
    }
  }

  const sessionTokenValue = usesBearer
    ? null
    : (await cookies()).get(PRIVILEGED_SESSION_COOKIE)?.value;
  const authorization = await authorizePrivilegedRequestOrSession(
    req,
    sessionTokenValue,
    'security.incident.coordinate',
    canonicalPrivilegedAuthorizationVerifier,
  );

  if (authorization.status === 'UNAVAILABLE') {
    return privateJson(
      { ok: false, error: 'privileged_auth_unavailable' },
      503,
    );
  }
  if (authorization.status !== 'AUTHORIZED') {
    return privateJson({ ok: false, error: 'unauthorized' }, 401);
  }

  const contentLengthRaw = req.headers.get('content-length');
  if (contentLengthRaw !== null) {
    const contentLength = Number(contentLengthRaw);
    if (
      !Number.isFinite(contentLength)
      || contentLength < 0
      || contentLength > MAX_BODY_BYTES
    ) {
      return privateJson({ ok: false, error: 'invalid_request_body' }, 413);
    }
  }

  const body = await req.text();
  if (
    new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES
    || body.length !== 0
  ) {
    return privateJson({ ok: false, error: 'request_body_not_allowed' }, 400);
  }

  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return privateJson({ ok: false, error: 'invalid_alert_id' }, 400);
  }

  if (authorization.role !== 'admin' && authorization.role !== 'operator') {
    return privateJson({ ok: false, error: 'unauthorized' }, 401);
  }

  const result = await emitSecurityAlertAcknowledgement({
    alertId: id.toLowerCase(),
    actorSubject: authorization.subject,
    actorRole: authorization.role,
    acknowledgedAt: new Date().toISOString(),
  });

  if (result.status === 'ACKNOWLEDGED') {
    return privateJson({
      ok: true,
      acknowledged: true,
      duplicate: result.duplicate,
    });
  }
  if (result.status === 'NOT_FOUND') {
    return privateJson({ ok: false, error: 'security_alert_not_found' }, 404);
  }
  if (result.status === 'CONFLICT') {
    return privateJson({ ok: false, error: 'security_alert_ack_conflict' }, 409);
  }

  return privateJson({ ok: false, error: 'security_alert_ack_unavailable' }, 503);
}
