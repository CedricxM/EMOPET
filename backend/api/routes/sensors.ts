import { and, desc, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PresenceEventCreateSchema, SensorSummaryCreateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { baselines, eliStates, sensorSummaries } from '../../db/schema/index.js';
import { requireDogOwnership } from '../middleware/authorization.js';
import { toGuardianAuthorizedBaselineExport } from '../services/data-export-policy.js';

const sensors = new Hono();

const PRESENCE_PERSISTENCE_NOT_READY = 'PRESENCE_PERSISTENCE_NOT_READY' as const;

function databaseUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: string,
): Response {
  return c.json({
    error: 'Product V1 database operation unavailable.',
    code: 'PRODUCT_DATABASE_OPERATION_UNAVAILABLE',
    operation,
    retryable: true,
  }, 503);
}

function parseRange(value: string | undefined): { label: string; since: Date } | null {
  const label = value ?? '24h';
  const match = /^(1|6|12|24|48|72)h$|^(7|14|30)d$/.exec(label);
  if (!match) return null;

  const amount = Number(label.slice(0, -1));
  const unit = label.at(-1);
  const durationMs = unit === 'h'
    ? amount * 60 * 60 * 1000
    : amount * 24 * 60 * 60 * 1000;

  return { label, since: new Date(Date.now() - durationMs) };
}

function presencePersistenceUnavailable(
  c: { json: (value: unknown, status?: number) => Response },
  operation: 'create_presence_event' | 'list_presence_events',
): Response {
  return c.json({
    error: 'Presence events do not yet have a durable Product V1 persistence authority.',
    code: PRESENCE_PERSISTENCE_NOT_READY,
    operation,
    retryable: false,
  }, 503);
}

sensors.post('/summaries', zValidator('json', SensorSummaryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  try {
    const [created] = await db
      .insert(sensorSummaries)
      .values({
        dogId: body.dogId,
        timestamp: body.timestamp,
        source: body.source,
        matPresenceMinutes: body.matPresenceMinutes,
        respiratoryRateMean: body.respiratoryRate?.mean,
        respiratoryRateStd: body.respiratoryRate?.std,
        respiratoryRateConfidence: body.respiratoryRate?.confidence,
        weightKg: body.weightKg,
        positionChanges: body.positionChanges,
        activityMinutes: body.activityMinutes,
        distanceKm: body.distanceKm,
        vocalEvents: body.vocalEvents,
        vocalEnergyMean: body.vocalEnergyMean,
        postureDistribution: body.postureDistribution,
        agitationEvents: body.agitationEvents,
        temperatureC: body.temperatureC,
        humidityPct: body.humidityPct,
      })
      .returning();

    if (!created) return databaseUnavailable(c, 'create_sensor_summary');
    return c.json({ summary: created }, 201);
  } catch {
    return databaseUnavailable(c, 'create_sensor_summary');
  }
});

sensors.get('/summaries/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = parseRange(c.req.query('range'));
  if (!range) return c.json({ error: 'range must be one of 1h, 6h, 12h, 24h, 48h, 72h, 7d, 14d, 30d' }, 400);

  try {
    const rows = await db
      .select()
      .from(sensorSummaries)
      .where(and(eq(sensorSummaries.dogId, dogId), gte(sensorSummaries.timestamp, range.since)))
      .orderBy(desc(sensorSummaries.timestamp));
    return c.json({ dogId, range: range.label, summaries: rows });
  } catch {
    return databaseUnavailable(c, 'list_sensor_summaries');
  }
});

sensors.get('/eli/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  try {
    const [latest] = await db
      .select()
      .from(eliStates)
      .where(eq(eliStates.dogId, dogId))
      .orderBy(desc(eliStates.timestamp))
      .limit(1);
    return c.json({ dogId, eli: latest ?? null });
  } catch {
    return databaseUnavailable(c, 'get_latest_eli_state');
  }
});

sensors.get('/eli/:dogId/history', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = parseRange(c.req.query('range') ?? '7d');
  if (!range) return c.json({ error: 'range must be one of 1h, 6h, 12h, 24h, 48h, 72h, 7d, 14d, 30d' }, 400);

  try {
    const history = await db
      .select()
      .from(eliStates)
      .where(and(eq(eliStates.dogId, dogId), gte(eliStates.timestamp, range.since)))
      .orderBy(desc(eliStates.timestamp));
    return c.json({ dogId, range: range.label, history });
  } catch {
    return databaseUnavailable(c, 'list_eli_history');
  }
});

sensors.get('/baseline/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  try {
    const [baseline] = await db
      .select()
      .from(baselines)
      .where(eq(baselines.dogId, dogId))
      .limit(1);
    return c.json({
      dogId,
      baseline: baseline ? toGuardianAuthorizedBaselineExport(baseline) : null,
    });
  } catch {
    return databaseUnavailable(c, 'get_baseline');
  }
});

sensors.post('/presence/:dogId/events', zValidator('json', PresenceEventCreateSchema), async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const body = c.req.valid('json');
  if (body.dogId !== dogId) {
    return c.json({ error: 'dog_id_mismatch' }, 400);
  }

  return presencePersistenceUnavailable(c, 'create_presence_event');
});

sensors.get('/presence/:dogId/events', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  return presencePersistenceUnavailable(c, 'list_presence_events');
});

export { sensors, PRESENCE_PERSISTENCE_NOT_READY };
