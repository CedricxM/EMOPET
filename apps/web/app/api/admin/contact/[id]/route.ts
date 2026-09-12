/**
 * Legacy admin mutation for historical file-backed Contact requests.
 *
 * Disabled by default. Product V1 Contact/support authority is not implemented
 * by this route.
 */

import { NextResponse } from 'next/server';
import type { ContactRequest, ContactStatus, TimeSlot } from '../../../../../lib/contact';
import { collection } from '../../../../../lib/server/store';
import { isAdmin } from '../../../../../lib/server/admin';
import { legacyContactAuthorityGate } from '../../../../../lib/server/contact-authority';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

const VALID_STATUS: ContactStatus[] = ['pending', 'scheduled', 'completed', 'cancelled'];

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
  const authorityGate = legacyContactAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, adminLimiter, 'admin:contact:patch');
  if (limited) return limited;

  if (!isAdmin(req)) return demoJson({ ok: false, error: 'unauthorized' }, 401);
  const { id } = await ctx.params;
  let body: { status?: ContactStatus; scheduledSlot?: TimeSlot; teamNotes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return demoJson({ ok: false, errors: ['Requête invalide.'] }, 400);
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    return demoJson({ ok: false, errors: ['Statut invalide.'] }, 400);
  }
  const patch: Partial<ContactRequest> = {};
  if (body.status) patch.status = body.status;
  if (body.scheduledSlot) patch.scheduledSlot = body.scheduledSlot;
  if (typeof body.teamNotes === 'string') patch.teamNotes = body.teamNotes;
  const updated = collection<ContactRequest>('contact-requests').update(id, patch);
  if (!updated) return demoJson({ ok: false, errors: ['Demande introuvable.'] }, 404);
  return demoJson({ ok: true, request: updated });
}
