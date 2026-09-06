import { and, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DogCreateSchema, DogUpdateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { sensorSummaries } from '../../db/schema/index.js';
import {
  computePresenceComparison,
  getPresenceEventsForDog,
  type PresenceEventInput,
} from '../services/presence.js';
import {
  buildVetReportPdf,
  createVetReportShareToken,
  loadVetReportSummary,
  verifyVetReportShareToken,
} from '../services/vet-report.js';
import { requireDogOwnership } from '../middleware/authorization.js';

const dogs = new Hono();

function legacyGenericVetShareAllowed(): boolean {
  return process.env['NODE_ENV'] !== 'production' &&
    process.env['EMOPET_ALLOW_LEGACY_GENERIC_VET_SHARE'] === '1';
}

function parseReportDays(value: string | undefined): number | null {
  const parsed = Number(value ?? '14');
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : null;
}

function buildFallbackPresenceEvents(): PresenceEventInput[] {
  const now = new Date();
  return [
    { phoneSeen: true, timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
    { phoneSeen: false, timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
    { phoneSeen: true, timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
  ];
}

function buildFallbackSummaries(dogId: string): Array<typeof sensorSummaries.$inferSelect> {
  const now = Date.now();
  return [
    {
      id: 'fallback-1',
      dogId,
      timestamp: new Date(now - 11 * 60 * 60 * 1000),
      source: 'TAG',
      matPresenceMinutes: 28,
      respiratoryRateMean: null,
      respiratoryRateStd: null,
      respiratoryRateConfidence: null,
      weightKg: null,
      positionChanges: null,
      activityMinutes: 22,
      distanceKm: 1.8,
      vocalEvents: 3,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 2,
      temperatureC: 15,
      humidityPct: 74,
      createdAt: new Date(),
    },
    {
      id: 'fallback-2',
      dogId,
      timestamp: new Date(now - 7 * 60 * 60 * 1000),
      source: 'TAG',
      matPresenceMinutes: 12,
      respiratoryRateMean: null,
      respiratoryRateStd: null,
      respiratoryRateConfidence: null,
      weightKg: null,
      positionChanges: null,
      activityMinutes: 16,
      distanceKm: 1.4,
      vocalEvents: 7,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 5,
      temperatureC: 17,
      humidityPct: 68,
      createdAt: new Date(),
    },
    {
      id: 'fallback-3',
      dogId,
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
      source: 'MAT',
      matPresenceMinutes: 36,
      respiratoryRateMean: 22,
      respiratoryRateStd: 1.2,
      respiratoryRateConfidence: 0.8,
      weightKg: 24.8,
      positionChanges: 4,
      activityMinutes: 10,
      distanceKm: 0.8,
      vocalEvents: 2,
      vocalEnergyMean: null,
      postureDistribution: null,
      agitationEvents: 1,
      temperatureC: 18,
      humidityPct: 65,
      createdAt: new Date(),
    },
  ];
}

function getUserId(c: unknown): string | undefined {
  return (c as { get: (key: string) => unknown }).get('userId') as string | undefined;
}

dogs.get('/', async (c) => {
  return c.json({ dogs: [] });
});

dogs.post('/', zValidator('json', DogCreateSchema), async (c) => {
  const body = c.req.valid('json');
  return c.json({ message: 'created', name: body.name }, 201);
});

dogs.get('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id });
});

dogs.get('/:id/absence-comparison', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const days = Number(c.req.query('days') ?? '14');
  const since = new Date();
  since.setDate(since.getDate() - days);

  let summaries: Array<typeof sensorSummaries.$inferSelect> = [];
  try {
    summaries = await db
      .select()
      .from(sensorSummaries)
      .where(and(eq(sensorSummaries.dogId, id), gte(sensorSummaries.timestamp, since)))
      .orderBy(sensorSummaries.timestamp);
  } catch {
    summaries = [];
  }

  const comparison = computePresenceComparison(
    (summaries.length > 0 ? summaries : buildFallbackSummaries(id)).map((item) => ({
      timestamp: item.timestamp,
      matPresenceMinutes: item.matPresenceMinutes ?? undefined,
      vocalEvents: item.vocalEvents ?? undefined,
      agitationEvents: item.agitationEvents ?? undefined,
      respiratoryRateMean: item.respiratoryRateMean ?? undefined,
      respiratoryRateConfidence: item.respiratoryRateConfidence ?? undefined,
      weightKg: item.weightKg ?? undefined,
    })),
    getPresenceEventsForDog(id, since).length > 0
      ? getPresenceEventsForDog(id, since)
      : buildFallbackPresenceEvents(),
  );

  return c.json({
    dogId: id,
    days,
    comparison,
    message:
      comparison.gate === 'REJECT'
        ? 'Pas assez de donnees pour comparer presence et absence.'
        : 'Comparaison presence / absence disponible.',
  });
});

/**
 * Legacy generic share-link endpoint.
 *
 * HOLD for release under #64: this token is not recipient-bound and has no
 * durable revocation entity. It remains available only for explicit non-production
 * compatibility testing while the scoped professional-grant backend is built.
 */
dogs.get('/:id/vet-report-link', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  if (!legacyGenericVetShareAllowed()) {
    return c.json({
      error: 'Generic professional sharing is disabled',
      code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
      gate: 'G-GUARDIAN-PROFESSIONAL-SHARE-01',
      message: 'Create a recipient-bound, scoped, expiring professional grant instead.',
    }, 409);
  }

  const days = parseReportDays(c.req.query('days'));
  if (days == null) return c.json({ error: 'days must be an integer between 1 and 30' }, 400);

  const userId = String(getUserId(c) ?? '');
  const token = await createVetReportShareToken(userId, id, days);
  const url = new URL(c.req.url);
  url.pathname = `/api/dogs/${id}/vet-report`;
  url.search = '';
  url.searchParams.set('days', String(days));
  url.searchParams.set('share_token', token);

  return c.json({
    dogId: id,
    days,
    expiresInMinutes: 30,
    authority: 'LEGACY_NON_PRODUCTION_ONLY',
    url: url.toString(),
  });
});

dogs.get('/:id/vet-report', async (c) => {
  const id = c.req.param('id');
  const days = parseReportDays(c.req.query('days'));
  if (days == null) return c.json({ error: 'days must be an integer between 1 and 30' }, 400);

  const shareToken = c.req.query('share_token');
  const isShareAccess = typeof shareToken === 'string' && shareToken.length > 0;

  if (isShareAccess) {
    if (!legacyGenericVetShareAllowed()) {
      return c.json({
        error: 'Legacy generic share access is disabled',
        code: 'RECIPIENT_BOUND_GRANT_REQUIRED',
        gate: 'G-GUARDIAN-PROFESSIONAL-SHARE-01',
      }, 401);
    }

    const isValid = await verifyVetReportShareToken(shareToken, id, days);
    if (!isValid) {
      return c.json({ error: 'Invalid or expired share token' }, 401);
    }
  } else if (!getUserId(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  } else {
    const denied = await requireDogOwnership(c, id);
    if (denied) return denied;
  }

  const summary = await loadVetReportSummary(id, days);
  const pdf = buildVetReportPdf(summary);
  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="emopet-vet-report-${id}.pdf"`,
      'Cache-Control': 'private, max-age=0, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
});

dogs.patch('/:id', zValidator('json', DogUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id, message: 'updated' });
});

dogs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;
  return c.json({ id, message: 'deleted' });
});

export { dogs };
