/**
 * Demandes de contact — persistance SERVEUR (R3, première tranche réelle).
 *
 * POST   /api/contact      crée une demande (validation, rate-limit, notif équipe)
 * GET    /api/contact      liste les demandes (démo : toutes ; auth utilisateur différée)
 * DELETE /api/contact?id=  supprime une demande (droit à l'effacement RGPD)
 *
 * Store fichier JSON (lib/server/store) — remplaçable par Drizzle/Postgres.
 * ⚠ Chiffrement au repos de contactValue + purge cron 6 mois = passe Postgres.
 */

import { NextResponse } from 'next/server';
import { MAX_ACTIVE_REQUESTS, buildRequest, validateContactInput } from '../../../lib/contact';
import type { ContactRequest, NewContactInput } from '../../../lib/contact';
import { isAdmin } from '../../../lib/server/admin';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../lib/server/request-security';
import { collection } from '../../../lib/server/store';
import { notifyTeamOfContactRequest } from '../../../lib/server/notify';

export const runtime = 'nodejs';

const requests = collection<ContactRequest>('contact-requests');
const OWNER_HEADER = 'x-contact-owner-token';
const contactReadLimiter = createFixedWindowRateLimiter({ limit: 60, windowMs: 60_000 });
const contactWriteLimiter = createFixedWindowRateLimiter({ limit: 10, windowMs: 60_000 });

function activeCount(items: ContactRequest[]): number {
  return items.filter((r) => r.status === 'pending' || r.status === 'scheduled').length;
}

function ownerTokenFromRequest(req: Request): string | null {
  const token = req.headers.get(OWNER_HEADER)?.trim();
  return token ? token : null;
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, contactReadLimiter, 'contact:get');
  if (limited) return limited;
  if (isAdmin(req)) return NextResponse.json({ requests: requests.list() });
  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) {
    return NextResponse.json({ ok: false, errors: ['Non autorisé.'] }, { status: 401 });
  }
  return NextResponse.json({ requests: requests.list().filter((r) => r.ownerToken === ownerToken) });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, contactWriteLimiter, 'contact:post');
  if (limited) return limited;

  let input: NewContactInput;
  try {
    input = (await req.json()) as NewContactInput;
  } catch {
    return NextResponse.json({ ok: false, errors: ['Requête invalide.'] }, { status: 400 });
  }

  const errors = validateContactInput(input);
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });

  const ownerToken = input.ownerToken?.trim() || ownerTokenFromRequest(req);
  if (!ownerToken) {
    return NextResponse.json({ ok: false, errors: ['Jeton propriétaire manquant.'] }, { status: 400 });
  }

  if (activeCount(requests.list().filter((item) => item.ownerToken === ownerToken)) >= MAX_ACTIVE_REQUESTS) {
    return NextResponse.json({ ok: false, errors: [`Vous avez déjà ${MAX_ACTIVE_REQUESTS} demandes actives.`] }, { status: 429 });
  }

  const request = buildRequest({ ...input, ownerToken });
  requests.insert(request);
  const notify = await notifyTeamOfContactRequest(request);

  return NextResponse.json({ ok: true, request, notified: notify.sent }, { status: 201 });
}

export async function DELETE(req: Request) {
  const limited = enforceRateLimit(req, contactWriteLimiter, 'contact:delete');
  if (limited) return limited;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, errors: ['id manquant'] }, { status: 400 });
  const all = requests.list();
  const target = all.find((item) => item.id === id);
  if (!target) return NextResponse.json({ ok: false, errors: ['Demande introuvable.'] }, { status: 404 });
  if (!isAdmin(req)) {
    const ownerToken = ownerTokenFromRequest(req);
    if (!ownerToken || target.ownerToken !== ownerToken) {
      return NextResponse.json({ ok: false, errors: ['Non autorisé.'] }, { status: 404 });
    }
  }
  requests.remove(id);
  return NextResponse.json({ ok: true });
}
