/**
 * Traitement privilégié d'une demande de contact.
 * PATCH /api/admin/contact/:id  body { status?, scheduledSlot?, teamNotes? }
 *
 * Browser mutation authority is session-only: exact configured Origin first,
 * then the server-read HttpOnly privileged session, then one finite RBAC action.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ContactRequest, ContactStatus, TimeSlot } from '../../../../../lib/contact';
import { canonicalPrivilegedAuthorizationVerifier } from '../../../../../lib/server/canonical-privileged-verifier';
import { evaluatePrivilegedMutationOrigin } from '../../../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedSessionToken } from '../../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../../../lib/server/privileged-web-origin-config';
import { collection } from '../../../../../lib/server/store';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

const VALID_STATUS: ContactStatus[] = ['pending', 'scheduled', 'completed', 'cancelled'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, adminLimiter, 'admin:contact:patch');
  if (limited) return limited;

  const originConfig = resolvePrivilegedWebOrigin();
  if (originConfig.status !== 'CONFIGURED') {
    return NextResponse.json(
      { ok: false, error: 'privileged_origin_unavailable' },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }

  const originDecision = evaluatePrivilegedMutationOrigin({
    request: req,
    expectedOrigin: originConfig.origin,
  });
  if (originDecision.status !== 'ALLOWED') {
    return NextResponse.json(
      { ok: false, error: 'forbidden_origin' },
      { status: 403, headers: PRIVATE_NO_STORE },
    );
  }

  // This browser mutation surface is deliberately session-only. Explicit
  // Authorization traffic cannot downgrade/fall through to a valid cookie.
  if (req.headers.has('authorization')) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const sessionTokenValue = (await cookies()).get(PRIVILEGED_SESSION_COOKIE)?.value;
  const authorization = await authorizePrivilegedSessionToken(
    sessionTokenValue,
    'contact.request.manage',
    canonicalPrivilegedAuthorizationVerifier,
  );

  if (authorization.status === 'UNAVAILABLE') {
    return NextResponse.json(
      { ok: false, error: 'privileged_auth_unavailable' },
      { status: 503, headers: PRIVATE_NO_STORE },
    );
  }
  if (authorization.status !== 'AUTHORIZED') {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: PRIVATE_NO_STORE },
    );
  }

  const { id } = await ctx.params;
  let body: { status?: ContactStatus; scheduledSlot?: TimeSlot; teamNotes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, errors: ['Requête invalide.'] },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json(
      { ok: false, errors: ['Statut invalide.'] },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }

  const patch: Partial<ContactRequest> = {};
  if (body.status) patch.status = body.status;
  if (body.scheduledSlot) patch.scheduledSlot = body.scheduledSlot;
  if (typeof body.teamNotes === 'string') patch.teamNotes = body.teamNotes;

  const updated = collection<ContactRequest>('contact-requests').update(id, patch);
  if (!updated) {
    return NextResponse.json(
      { ok: false, errors: ['Demande introuvable.'] },
      { status: 404, headers: PRIVATE_NO_STORE },
    );
  }

  return NextResponse.json(
    { ok: true, request: updated },
    { headers: PRIVATE_NO_STORE },
  );
}
