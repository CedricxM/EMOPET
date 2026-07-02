/**
 * GET /api/context?lat=&lon=&date=&country= — contexte EMOPET agrégé (NON médical).
 *
 * Compose météo / qualité de l'air / localisation / calendrier via la couche API
 * (providers actifs uniquement, arbitrés). Rate-limité ; timeout global ; renvoie un
 * `EMOPETContext` tamponné non médical. Aucune conclusion sur l'animal.
 */

import { NextResponse } from 'next/server';
import { buildContext } from '../../../lib/context-engine/orchestrator';
import { createFixedWindowRateLimiter } from '../../../lib/server/rate-limit';

export const runtime = 'nodejs';

const limiter = createFixedWindowRateLimiter({ limit: 30, windowMs: 60_000 });

function clientKey(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = req.headers.get('cf-connecting-ip')?.trim() || req.headers.get('x-real-ip')?.trim() || forwardedFor || 'local';
  return `context:${ip}`;
}

export async function GET(req: Request) {
  const rate = limiter.check(clientKey(req));
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      {
        status: 429,
        headers: {
          'retry-after': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
          'x-ratelimit-limit': String(rate.limit),
          'x-ratelimit-remaining': String(rate.remaining),
          'x-ratelimit-reset': String(Math.ceil(rate.resetAt / 1000)),
        },
      },
    );
  }

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ ok: false, errors: ['Paramètres lat/lon invalides.'] }, { status: 400 });
  }

  const date = url.searchParams.get('date') ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, errors: ['Format de date attendu : YYYY-MM-DD.'] }, { status: 400 });
  }
  const countryRaw = url.searchParams.get('country') ?? undefined;
  if (countryRaw && !/^[A-Za-z]{2}$/.test(countryRaw)) {
    return NextResponse.json({ ok: false, errors: ['Code pays attendu : 2 lettres ISO.'] }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const context = await buildContext({ lat, lon, date, country: countryRaw?.toUpperCase() }, undefined, controller.signal);
    return NextResponse.json({ ok: true, context });
  } catch {
    return NextResponse.json({ ok: false, errors: ['Contexte indisponible.'] }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
