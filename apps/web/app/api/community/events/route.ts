/**
 * Événements de cercle — persistance SERVEUR (R3, tranche communauté).
 * GET  /api/community/events[?circleId=]   liste (seed des événements démo si vide)
 * POST /api/community/events               crée un événement (RDV → carte /local)
 */

import { NextResponse } from 'next/server';
import { INITIAL_EVENTS, buildEvent, publicCommunityCoordinate, validateEventInput } from '../../../../lib/community';
import type { CircleEvent, EventCreateInput } from '../../../../lib/community';
import { createFixedWindowRateLimiter } from '../../../../lib/server/rate-limit';
import { cleanDisplayName, enforceRateLimit, readLimitedJson } from '../../../../lib/server/request-security';
import { collection } from '../../../../lib/server/store';

export const runtime = 'nodejs';

const events = collection<CircleEvent>('community-events');
const eventsReadLimiter = createFixedWindowRateLimiter({ limit: 90, windowMs: 60_000 });
const eventsWriteLimiter = createFixedWindowRateLimiter({ limit: 12, windowMs: 60_000 });
const EVENT_MAX_BODY_BYTES = 12 * 1024;

function listSeeded(): CircleEvent[] {
  let all = events.list();
  if (all.length === 0) {
    for (const e of [...INITIAL_EVENTS].reverse()) events.insert(e);
    all = events.list();
  }
  return all;
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, eventsReadLimiter, 'community:events:get');
  if (limited) return limited;

  const circleId = new URL(req.url).searchParams.get('circleId');
  const all = listSeeded().map(publicEvent);
  return NextResponse.json({ events: circleId ? all.filter((e) => e.circleId === circleId) : all });
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, eventsWriteLimiter, 'community:events:post');
  if (limited) return limited;
  const parsed = await readLimitedJson<EventCreateInput>(req, EVENT_MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [parsed.error === 'payload_too_large' ? 'Requete trop volumineuse.' : 'Requete invalide.'] }, { status: parsed.status });
  }
  const input = parsed.data;
  const errors = validateEventInput(input);
  if (errors.length > 0) return NextResponse.json({ ok: false, errors }, { status: 400 });
  listSeeded();
  const event = buildEvent({ ...input, organizerName: cleanDisplayName(input.organizerName, 'Membre') });
  events.insert(event);
  return NextResponse.json({ ok: true, event: publicEvent(event) }, { status: 201 });
}

function publicEvent(event: CircleEvent): CircleEvent {
  return {
    ...event,
    lat: publicCommunityCoordinate(event.lat),
    lon: publicCommunityCoordinate(event.lon),
  };
}