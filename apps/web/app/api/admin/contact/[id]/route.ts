/**
 * Traitement privilégié d'une demande de contact.
 * PATCH /api/admin/contact/:id  body { status?, scheduledSlot?, teamNotes? }
 *
 * Browser mutation authority is session-only: exact configured Origin first,
 * then the server-read HttpOnly privileged session, then one finite RBAC action.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ContactRequest } from '../../../../../lib/contact';
import { parseAdminContactPatch } from '../../../../../lib/server/admin-contact-patch';
import { canonicalPrivilegedAuthorizationVerifier } from '../../../../../lib/server/canonical-privileged-verifier';
import { evaluatePrivilegedMutationOrigin } from '../../../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedSessionToken } from '../../../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../../../lib/server/privileged-web-origin-config';
import { collection } from '../../../../../lib/server/store';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };
const MAX_ADMIN_CONTACT_PATCH_BYTES = 8 * 1024;

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
  const body = await readLimitedJson<unknown>(req, MAX_ADMIN_CONTACT_PATCH_BYTES);
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, errors: [body.status === 413 ? 'Requête trop volumineuse.' : 'Requête invalide.'] },
      { status: body.status, headers: PRIVATE_NO_STORE },
    );
  }

  const parsed = parseAdminContactPatch(body.data);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, errors: ['Requête invalide.'] },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }

  const patch: Partial<ContactRequest> = {};
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.scheduledSlot !== undefined) patch.scheduledSlot = parsed.scheduledSlot;
  if (parsed.teamNotes !== undefined) patch.teamNotes = parsed.teamNotes;

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
