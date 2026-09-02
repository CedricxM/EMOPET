import { and, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DogCreateSchema, DogUpdateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { dogs as dogTable, sensorSummaries, users } from '../../db/schema/index.js';
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
import { getCurrentUserId, requireDogOwnership } from '../middleware/authorization.js';

const dogs = new Hono();

type DogRow = typeof dogTable.$inferSelect;

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function serializeDog(row: DogRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    breed: row.breed,
    breedFciNumber: row.breedFciNumber,
    birthDate: row.birthDate,
    sex: row.sex,
    weight: row.weight,
    furClass: row.furClass,
    photo: row.photoUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
  const ownerId = getCurrentUserId(c);
  if (!ownerId) return c.json({ error: 'unauthorized' }, 401);

  const rows = await db
    .select()
    .from(dogTable)
    .where(eq(dogTable.ownerId, ownerId))
    .orderBy(dogTable.createdAt);

  return c.json({ dogs: rows.map(serializeDog) });
});

dogs.post('/', zValidator('json', DogCreateSchema), async (c) => {
  const ownerId = getCurrentUserId(c);
  if (!ownerId) return c.json({ error: 'unauthorized' }, 401);

  const body = c.req.valid('json');
  const created = await db.transaction(async (tx) => {
    const [guardian] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);

    if (!guardian) return null;

    const [row] = await tx
      .insert(dogTable)
      .values({
        ownerId,
        name: body.name,
        breed: body.breed,
        breedFciNumber: body.breedFciNumber ?? null,
        birthDate: toDateOnly(body.birthDate),
        sex: body.sex,
        weight: body.weight,
        furClass: body.furClass,
        photoUrl: body.photo ?? null,
      })
      .returning();

    return row ?? null;
  });

  if (!created) return c.json({ error: 'unauthorized' }, 401);
  return c.json({ dog: serializeDog(created) }, 201);
});

dogs.get('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  const ownerId = getCurrentUserId(c);
  if (!ownerId) return c.json({ error: 'unauthorized' }, 401);

  const [row] = await db
    .select()
    .from(dogTable)
    .where(and(eq(dogTable.id, id), eq(dogTable.ownerId, ownerId)))
    .limit(1);

  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({ dog: serializeDog(row) });
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

  const ownerId = getCurrentUserId(c);
  if (!ownerId) return c.json({ error: 'unauthorized' }, 401);

  const body = c.req.valid('json');
  const updates: Partial<typeof dogTable.$inferInsert> = {};
  let hasChanges = false;

  if (body.name !== undefined) { updates.name = body.name; hasChanges = true; }
  if (body.breed !== undefined) { updates.breed = body.breed; hasChanges = true; }
  if (body.breedFciNumber !== undefined) { updates.breedFciNumber = body.breedFciNumber; hasChanges = true; }
  if (body.birthDate !== undefined) { updates.birthDate = toDateOnly(body.birthDate); hasChanges = true; }
  if (body.sex !== undefined) { updates.sex = body.sex; hasChanges = true; }
  if (body.weight !== undefined) { updates.weight = body.weight; hasChanges = true; }
  if (body.furClass !== undefined) { updates.furClass = body.furClass; hasChanges = true; }
  if (body.photo !== undefined) { updates.photoUrl = body.photo; hasChanges = true; }

  if (!hasChanges) return c.json({ error: 'no_updates' }, 400);
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(dogTable)
    .set(updates)
    .where(and(eq(dogTable.id, id), eq(dogTable.ownerId, ownerId)))
    .returning();

  if (!updated) return c.json({ error: 'not_found' }, 404);
  return c.json({ dog: serializeDog(updated) });
});

dogs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const denied = await requireDogOwnership(c, id);
  if (denied) return denied;

  // PRIV-01 (#69) must define the erasure graph before any destructive dog delete.
  return c.json({
    error: 'erasure_policy_pending',
    gate: 'PRIV-01',
  }, 501);
});

export { dogs };
