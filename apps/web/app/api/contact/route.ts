/**
 * Demandes de contact — persistance SERVEUR (R3, première tranche réelle).
 *
 * POST   /api/contact      crée une demande (validation, rate-limit, notif équipe)
 * GET    /api/contact      liste les demandes (owner scope ou lecture privilégiée canonique)
 * DELETE /api/contact?id=  supprime une demande (owner explicite ou session privilégiée canonique)
 *
 * Store fichier JSON (lib/server/store) — remplaçable par Drizzle/Postgres.
 * ⚠ Chiffrement au repos de contactValue + purge cron 6 mois = passe Postgres.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { MAX_ACTIVE_REQUESTS, buildRequest, validateContactInput } from '../../../lib/contact';
import type { ContactRequest, NewContactInput } from '../../../lib/contact';
import { canonicalPrivilegedAuthorizationVerifier } from '../../../lib/server/canonical-privileged-verifier';
import { resolveContactReadAuthority } from '../../../lib/server/contact-read-authority';
import { evaluatePrivilegedMutationOrigin } from '../../../lib/server/privileged-mutation-origin';
import { authorizePrivilegedSessionToken } from '../../../lib/server/privileged-request';
import { PRIVILEGED_SESSION_COOKIE } from '../../../lib/server/privileged-session';
import { resolvePrivilegedWebOrigin } from '../../../lib/server/privileged-web-origin-config';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../lib/server/request-security';
import { collection } from '../../../lib/server/store';
import { notifyTeamOfContactRequest } from '../../../lib/server/notify';

export const runtime = 'nodejs';

const requests = collection<ContactRequest>('contact-requests');
const OWNER_HEADER = 'x-contact-owner-token';
const contactReadLimiter = createFixedWindowRateLimiter({ limit: 60, windowMs: 60_000 });
const contactWriteLimiter = createFixedWindowRateLimiter({ limit: 10, windowMs: 60_000 });
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

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

  const authority = await resolveContactReadAuthority(
    req,
    canonicalPrivilegedAuthorizationVerifier,
  );

  if (authority.status === 'UNAVAILABLE') {
    return NextResponse.json({ ok: false, errors: ['Service indisponible.'] }, { status: 503 });
  }
  if (authority.status === 'DENIED') {
    return NextResponse.json({ ok: false, errors: ['Non autorisé.'] }, { status: 401 });
  }
  if (authority.status === 'AUTHORIZED') {
    return NextResponse.json({ requests: requests.list() });
  }

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
  if (!id) {
    return NextResponse.json(
      { ok: false, errors: ['id manquant'] },
      { status: 400, headers: PRIVATE_NO_STORE },
    );
  }

  // Explicit owner authority is terminal. A wrong owner token never falls
  // through to a privileged cookie that the browser may also carry.
  const ownerToken = ownerTokenFromRequest(req);
  if (ownerToken) {
    const target = requests.list().find((item) => item.id === id);
    if (!target || target.ownerToken !== ownerToken) {
      return NextResponse.json(
        { ok: false, errors: ['Non autorisé.'] },
        { status: 404, headers: PRIVATE_NO_STORE },
      );
    }

    requests.remove(id);
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  }

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

  const target = requests.list().find((item) => item.id === id);
  if (!target) {
    return NextResponse.json(
      { ok: false, errors: ['Demande introuvable.'] },
      { status: 404, headers: PRIVATE_NO_STORE },
    );
  }

  requests.remove(id);
  return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
}
