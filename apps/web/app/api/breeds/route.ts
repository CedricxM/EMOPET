/**
 * Référentiel des races (lecture).
 * GET /api/breeds            → liste complète (normalisée)
 * GET /api/breeds?q=labrador → recherche par nom
 * GET /api/breeds?id=fci-122 → une race
 *
 * Lecture seule, traçable (source + version). Aucune écriture (le référentiel
 * est canonique). Seules les races VERIFIED devraient nourrir une réponse réelle.
 *
 * Un référentiel illisible n'est pas un référentiel vide : la réponse le dit
 * (503) au lieu d'affirmer `ok: true, count: 0` ou `not_found` sur un id.
 */

import { NextResponse } from 'next/server';
import { BreedReferenceUnavailableError, getBreed, listBreeds, searchBreeds } from '../../../lib/server/breeds';
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

  try {
    if (id) {
      const breed = getBreed(id);
      // 404 n'est légitime que si le référentiel a bien été chargé et que l'id
      // ne s'y trouve pas — pas quand on ignore ce qu'il contient.
      if (!breed) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true, breed });
    }
    const breeds = q ? searchBreeds(q) : listBreeds();
    return NextResponse.json({ ok: true, count: breeds.length, breeds });
  } catch (error) {
    if (error instanceof BreedReferenceUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'breed_reference_unavailable',
          message: 'Le référentiel des races n’a pas pu être lu. Ce n’est pas une absence de races.',
        },
        { status: 503 },
      );
    }
    throw error;
  }
}
