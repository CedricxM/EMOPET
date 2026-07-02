/**
 * Spots de la carte communautaire â€” persistance SERVEUR (R3, tranche carte).
 *
 * GET  /api/map/spots   liste tous les spots (seed des spots de dÃ©mo si vide)
 * POST /api/map/spots   crÃ©e un spot (validation dÃ©terministe, bornes Bretagne)
 *
 * DonnÃ©e intrinsÃ¨quement communautaire â†’ doit vivre cÃ´tÃ© serveur (â‰  par appareil).
 * Store fichier JSON (lib/server/store), remplaÃ§able par Drizzle/Postgres.
 */

import { NextResponse } from 'next/server';
import { INITIAL_SPOTS, buildSpot, validateNewSpot } from '../../../../components/bretagne-map/spots';
import { containsForbiddenContent } from '../../../../lib/community';
import type { CommunitySpot, SpotCreateInput } from '../../../../components/bretagne-map/spots';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { enforceRateLimit, readLimitedJson } from '../../../../lib/server/request-security';
import { collection } from '../../../../lib/server/store';

export const runtime = 'nodejs';

const spots = collection<CommunitySpot>('map-spots');
const mapReadLimiter = createFixedWindowRateLimiter({ limit: 90, windowMs: 60_000 });
const mapWriteLimiter = createFixedWindowRateLimiter({ limit: 12, windowMs: 60_000 });
const SPOT_MAX_BODY_BYTES = 12 * 1024;

function listSeeded(): CommunitySpot[] {
  let all = spots.list();
  if (all.length === 0) {
    for (const s of [...INITIAL_SPOTS].reverse()) spots.insert(s);
    all = spots.list();
  }
  return all;
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, mapReadLimiter, 'map:spots:get');
  if (limited) return limited;

  return NextResponse.json({ spots: listSeeded().map(publicSpot) });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, mapWriteLimiter, 'map:spots:post');
  if (limited) return limited;
  const parsed = await readLimitedJson<SpotCreateInput>(req, SPOT_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, { status: parsed.status });
  }
  const input = parsed.data;
  const errors = validateNewSpot(input);
  if (containsForbiddenContent([input.name, input.description].filter(Boolean).join(' ')).blocked) errors.push('Contenu non autorise detecte.');
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });
  listSeeded(); // garantit le seed avant insertion
  const spot = buildSpot(input);
  spots.insert(spot);
  return NextResponse.json({ ok: true, spot: publicSpot(spot) }, { status: 201 });
}

function publicSpot(spot: CommunitySpot): CommunitySpot {
  return {
    ...spot,
    authorName: spot.isAnonymous ? undefined : spot.authorName,
    comments: spot.comments.map((comment) => ({
      ...comment,
      authorName: comment.authorName?.trim() ? comment.authorName : 'Anonyme',
    })),
  };
}

