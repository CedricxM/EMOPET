/**
 * Carnet du chien — persistance SERVEUR (R3, tranche carnet).
 *
 * GET    /api/journal       liste les entrées (seed des entrées démo si vide)
 * POST   /api/journal       ajoute une entrée (construite côté client, validée ici)
 * DELETE /api/journal?id=   supprime une entrée (droit à l'effacement)
 *
 * ⚠ Données privées : sans auth, c'est le carnet du chien de démo. À scoper par
 * dogId/userId quand l'auth sera là. Photos en data URL = à migrer vers R2 (storage).
 */

import { NextResponse } from 'next/server';
import { INITIAL_ENTRIES, JOURNAL_OWNER_HEADER, validateJournalEntry } from '../../../lib/journal';
import type { JournalEntry } from '../../../lib/journal';
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

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, journalReadLimiter, 'journal:get');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  const all = listSeeded();
  const visible = all.filter((entry) => entry.ownerToken === DEMO_OWNER || (ownerToken && entry.ownerToken === ownerToken));
  return NextResponse.json({ entries: visible.map(stripOwner) });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, journalWriteLimiter, 'journal:post');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) return NextResponse.json({ ok: false, errors: ['Non autorise.'] }, { status: 401 });
  const parsed = await readLimitedJson<JournalEntry>(req, JOURNAL_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] },
      { status: parsed.status },
    );
  }
  const entry = parsed.data;
  const errors = validateJournalEntry(entry);
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });
  listSeeded(); // garantit le seed avant insertion
  if (entries.list().some((e) => e.id === entry.id && e.ownerToken === ownerToken)) {
    return NextResponse.json({ ok: true, entry, duplicate: true });
  }
  entries.insert({ ...entry, ownerToken });
  return NextResponse.json({ ok: true, entry }, { status: 201 });
}

export async function DELETE(req: Request) {
  const limited = enforceRateLimit(req, journalWriteLimiter, 'journal:delete');
  if (limited) return limited;

  const ownerToken = ownerTokenFromRequest(req);
  if (!ownerToken) return NextResponse.json({ ok: false, errors: ['Non autorise.'] }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, errors: ['id manquant'] }, { status: 400 });
  const target = entries.list().find((entry) => entry.id === id && entry.ownerToken === ownerToken);
  if (!target) return NextResponse.json({ ok: false, errors: ['Entree introuvable.'] }, { status: 404 });
  entries.removeWhere((entry) => entry.id === id && entry.ownerToken === ownerToken);
  return NextResponse.json({ ok: true });
}
