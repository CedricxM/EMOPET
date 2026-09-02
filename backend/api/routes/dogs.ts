import { and, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DogCreateSchema, DogUpdateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { sensorSummaries } from '../../db/schema/index.js';
import {
  computePresenceComparison,
  getPresenceEventsForDog,
  PresenceComparisonDataUnavailableError,
  readPresenceComparisonSource,
} from '../services/presence.js';
import {
  buildVetReportPdf,
  createVetReportShareToken,
  loadVetReportSummary,
  verifyVetReportShareToken,
} from '../services/vet-report.js';
import { requireDogOwnership } from '../middleware/authorization.js';
import { parseLookbackWindow } from '../utils/temporal-window.js';

const dogs = new Hono();

const PRESENCE_COMPARISON_AUTHORITY = {
  status: 'PROTOTYPE_SEMANTICS_UNVALIDATED' as const,
  publishable: false,
  controllingGate: 'SCI-PRES-01' as const,
  syntheticFallback: false,
};

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

  const window = parseLookbackWindow(c.req.query('days'));
  if (!window) {
    return c.json({ error: 'invalid_presence_window', parameter: 'days' }, 400);
  }
  const { days, since } = window;

  let summaries: Array<typeof sensorSummaries.$inferSelect>;
  try {
    summaries = await readPresenceComparisonSource(() =>
      db
        .select()
        .from(sensorSummaries)
        .where(and(eq(sensorSummaries.dogId, id), gte(sensorSummaries.timestamp, since)))
        .orderBy(sensorSummaries.timestamp),
    );
  } catch (error) {
    if (error instanceof PresenceComparisonDataUnavailableError) {
      c.header('Cache-Control', 'private, max-age=0, no-store');
      return c.json(
        {
          error: error.code,
          message: 'Presence comparison data is temporarily unavailable.',
        },
        503,
      );
    }
    throw error;
  }

  const presenceEvents = getPresenceEventsForDog(id, since);
  const comparison = computePresenceComparison(
    summaries.map((item) => ({
      timestamp: item.timestamp,
      matPresenceMinutes: item.matPresenceMinutes ?? undefined,
      vocalEvents: item.vocalEvents ?? undefined,
      agitationEvents: item.agitationEvents ?? undefined,
      respiratoryRateMean: item.respiratoryRateMean ?? undefined,
      respiratoryRateConfidence: item.respiratoryRateConfidence ?? undefined,
      weightKg: item.weightKg ?? undefined,
    })),
    presenceEvents,
  );

  return c.json({
    dogId: id,
    days,
    comparison,
    authority: PRESENCE_COMPARISON_AUTHORITY,
    message:
      comparison.gate === 'REJECT'
        ? 'Pas assez de donnees pour cette comparaison prototype.'
        : 'Comparaison prototype calculee pour QA ; publication produit non autorisee.',
  });
});

dogs.get('/:id/vet-report-link', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const days = Number(c.req.query('days') ?? '14');
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
    url: url.toString(),
  });
});

dogs.get('/:id/vet-report', async (c) => {
  const id = c.req.param('id');
  const days = Number(c.req.query('days') ?? '14');
  const shareToken = c.req.query('share_token');
  const isShareAccess = typeof shareToken === 'string' && shareToken.length > 0;

  if (isShareAccess) {
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
