/**
 * Legacy file-backed Contact prototype.
 *
 * The historical JSON store and caller-provided owner token are not Product V1
 * PII or Owner-identity authority. This route is disabled by default and may
 * run only under an explicit non-production Contact demo opt-in.
 */

import { NextResponse } from 'next/server';
import { MAX_ACTIVE_REQUESTS, buildRequest, validateContactInput } from '../../../lib/contact';
import type { ContactRequest, NewContactInput } from '../../../lib/contact';
import { isAdmin } from '../../../lib/server/admin';
import { legacyContactAuthorityGate } from '../../../lib/server/contact-authority';
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

export async function GET(req: Request) {
  const authorityGate = legacyContactAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, contactReadLimiter, 'contact:get');
  if (limited) return limited;
  if (isAdmin(req)) return demoJson({ requests: requests.list() });
  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) {
    return demoJson({ ok: false, errors: ['Non autorisé.'] }, 401);
  }
  return demoJson({ requests: requests.list().filter((r) => r.ownerToken === ownerToken) });
}

export async function POST(req: Request) {
  const authorityGate = legacyContactAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, contactWriteLimiter, 'contact:post');
  if (limited) return limited;

  let input: NewContactInput;
  try {
    input = (await req.json()) as NewContactInput;
  } catch {
    return demoJson({ ok: false, errors: ['Requête invalide.'] }, 400);
  }

  const errors = validateContactInput(input);
  if (errors.length > 0) return demoJson({ ok: false, errors }, 400);

  const ownerToken = input.ownerToken?.trim() || ownerTokenFromRequest(req);
  if (!ownerToken) {
    return demoJson({ ok: false, errors: ['Jeton propriétaire manquant.'] }, 400);
  }

  if (activeCount(requests.list().filter((item) => item.ownerToken === ownerToken)) >= MAX_ACTIVE_REQUESTS) {
    return demoJson({ ok: false, errors: [`Vous avez déjà ${MAX_ACTIVE_REQUESTS} demandes actives.`] }, 429);
  }

  const request = buildRequest({ ...input, ownerToken });
  requests.insert(request);
  const notify = await notifyTeamOfContactRequest(request);

  return demoJson({ ok: true, request, notified: notify.sent }, 201);
}

export async function DELETE(req: Request) {
  const authorityGate = legacyContactAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, contactWriteLimiter, 'contact:delete');
  if (limited) return limited;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return demoJson({ ok: false, errors: ['id manquant'] }, 400);
  const all = requests.list();
  const target = all.find((item) => item.id === id);
  if (!target) return demoJson({ ok: false, errors: ['Demande introuvable.'] }, 404);
  if (!isAdmin(req)) {
    const ownerToken = ownerTokenFromRequest(req);
    if (!ownerToken || target.ownerToken !== ownerToken) {
      return demoJson({ ok: false, errors: ['Non autorisé.'] }, 404);
    }
  }
  requests.remove(id);
  return demoJson({ ok: true });
}
