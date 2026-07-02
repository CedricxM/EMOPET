/**
 * Référentiel des races (lecture).
 * GET /api/breeds            → liste complète (normalisée)
 * GET /api/breeds?q=labrador → recherche par nom
 * GET /api/breeds?id=fci-122 → une race
 *
 * Lecture seule, traçable (source + version). Aucune écriture (le référentiel
 * est canonique). Seules les races VERIFIED devraient nourrir une réponse réelle.
 */

import { NextResponse } from 'next/server';
import { getBreed, listBreeds, searchBreeds } from '../../../lib/server/breeds';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';
import { enforceRateLimit } from '../../../lib/server/request-security';

export const runtime = 'nodejs';
const breedsLimiter = createFixedWindowRateLimiter({ limit: 120, windowMs: 60_000 });

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, breedsLimiter, 'breeds:get');
  if (limited) return limited;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const q = url.searchParams.get('q')?.trim().slice(0, 80);

  if (id) {
    const breed = getBreed(id);
    if (!breed) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, breed });
  }
  const breeds = q ? searchBreeds(q) : listBreeds();
  return NextResponse.json({ ok: true, count: breeds.length, breeds });
}
