/**
 * Legacy community-map spots prototype.
 *
 * Product V1 shared Community authority lives behind the Hono/PostgreSQL
 * candidate. This historical JSON collection is disabled by default and may
 * run only under the explicit non-production Community demo opt-in.
 */

import { NextResponse } from 'next/server';
import { INITIAL_SPOTS, buildSpot, validateNewSpot } from '../../../../components/bretagne-map/spots';
import { containsForbiddenContent } from '../../../../lib/community';
import type { CommunitySpot, SpotCreateInput } from '../../../../components/bretagne-map/spots';
import { legacyCommunityAuthorityGate } from '../../../../lib/server/community-authority';
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
  const authorityGate = legacyCommunityAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, mapReadLimiter, 'map:spots:get');
  if (limited) return limited;

  return demoJson({ spots: listSeeded().map(publicSpot) });
}

export async function POST(req: Request) {
  const authorityGate = legacyCommunityAuthorityGate();
  if (authorityGate) return authorityGate;

  const limited = enforceRateLimit(req, mapWriteLimiter, 'map:spots:post');
  if (limited) return limited;
  const parsed = await readLimitedJson<SpotCreateInput>(req, SPOT_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return demoJson({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, parsed.status);
  }
  const input = parsed.data;
  const errors = validateNewSpot(input);
  if (containsForbiddenContent([input.name, input.description].filter(Boolean).join(' ')).blocked) errors.push('Contenu non autorise detecte.');
  if (errors.length > 0) return demoJson({ ok: false, errors }, 400);
  listSeeded();
  const spot = buildSpot(input);
  spots.insert(spot);
  return demoJson({ ok: true, spot: publicSpot(spot) }, 201);
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
