/**
 * Legacy Journal / Memories prototype plane.
 *
 * Product V1 Journal/Memory persistence is not wired yet. This historical
 * Next.js collection store is disabled by default and may run only in an
 * explicit non-production demo using EMOPET_ALLOW_LEGACY_JOURNAL_DEMO=1.
 *
 * It must never be interpreted as canonical Owner identity, retention,
 * erasure, sharing or durable Product V1 authority.
 */

import { NextResponse } from 'next/server';
import { INITIAL_ENTRIES, JOURNAL_OWNER_HEADER, validateJournalEntry } from '../../../lib/journal';
import type { JournalEntry } from '../../../lib/journal';
import { legacyJournalAuthorityGate } from '../../../lib/server/journal-authority';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../lib/server/request-security';
import { collection } from '../../../lib/server/store';

export const runtime = 'nodejs';

type StoredJournalEntry = JournalEntry & { ownerToken: string };

const DEMO_OWNER = 'demo';
const JOURNAL_MAX_BODY_BYTES = 24 * 1024;
const entries = collection<StoredJournalEntry>('journal-entries');
const journalReadLimiter = createFixedWindowRateLimiter({ limit: 90, windowMs: 60_000 });
const journalWriteLimiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

function ownerTokenFromRequest(req: Request): string | null {
  const token = req.headers.get(JOURNAL_OWNER_HEADER)?.trim();
  if (!token || token === DEMO_OWNER) return null;
  return token;
}

function stripOwner(entry: StoredJournalEntry): JournalEntry {
  const { ownerToken: _ownerToken, ...publicEntry } = entry;
  return publicEntry;
}

function listSeeded(): StoredJournalEntry[] {
  let all = entries.list();
  if (!all.some((entry) => entry.ownerToken === DEMO_OWNER)) {
    for (const e of [...INITIAL_ENTRIES].reverse()) entries.insert({ ...e, ownerToken: DEMO_OWNER });
    all = entries.list();
  }
  return all;
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
  const authorityGate = legacyJournalAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, journalReadLimiter, 'journal:get');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  const all = listSeeded();
  const visible = all.filter((entry) => entry.ownerToken === DEMO_OWNER || (ownerToken && entry.ownerToken === ownerToken));
  return demoJson({ entries: visible.map(stripOwner) });
}

export async function POST(req: Request) {
  const authorityGate = legacyJournalAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, journalWriteLimiter, 'journal:post');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) return demoJson({ ok: false, errors: ['Non autorise.'] }, 401);
  const parsed = await readLimitedJson<JournalEntry>(req, JOURNAL_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return demoJson(
      { ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] },
      parsed.status,
    );
  }
  const entry = parsed.data;
  const errors = validateJournalEntry(entry);
  if (errors.length > 0) return demoJson({ ok: false, errors }, 400);
  listSeeded();
  if (entries.list().some((e) => e.id === entry.id && e.ownerToken === ownerToken)) {
    return demoJson({ ok: true, entry, duplicate: true });
  }
  entries.insert({ ...entry, ownerToken });
  return demoJson({ ok: true, entry }, 201);
}

export async function DELETE(req: Request) {
  const authorityGate = legacyJournalAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, journalWriteLimiter, 'journal:delete');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) return demoJson({ ok: false, errors: ['Non autorise.'] }, 401);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return demoJson({ ok: false, errors: ['id manquant'] }, 400);
  const target = entries.list().find((entry) => entry.id === id && entry.ownerToken === ownerToken);
  if (!target) return demoJson({ ok: false, errors: ['Entree introuvable.'] }, 404);
  entries.removeWhere((entry) => entry.id === id && entry.ownerToken === ownerToken);
  return demoJson({ ok: true });
}
