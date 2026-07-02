/**
 * Traitement admin d'une demande de contact.
 * PATCH /api/admin/contact/:id  body { status?, scheduledSlot?, teamNotes? }
 */

import { NextResponse } from 'next/server';
import type { ContactRequest, ContactStatus, TimeSlot } from '../../../../../lib/contact';
import { collection } from '../../../../../lib/server/store';
import { isAdmin } from '../../../../../lib/server/admin';
import { createFixedWindowRateLimiter } from '../../../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../../../lib/server/request-security';

export const runtime = 'nodejs';
const adminLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

const VALID_STATUS: ContactStatus[] = ['pending', 'scheduled', 'completed', 'cancelled'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(req, adminLimiter, 'admin:contact:patch');
  if (limited) return limited;

  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  let body: { status?: ContactStatus; scheduledSlot?: TimeSlot; teamNotes?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errors: ['Requête invalide.'] }, { status: 400 });
  }
  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ ok: false, errors: ['Statut invalide.'] }, { status: 400 });
  }
  const patch: Partial<ContactRequest> = {};
  if (body.status) patch.status = body.status;
  if (body.scheduledSlot) patch.scheduledSlot = body.scheduledSlot;
  if (typeof body.teamNotes === 'string') patch.teamNotes = body.teamNotes;
  const updated = collection<ContactRequest>('contact-requests').update(id, patch);
  if (!updated) return NextResponse.json({ ok: false, errors: ['Demande introuvable.'] }, { status: 404 });
  return NextResponse.json({ ok: true, request: updated });
}
