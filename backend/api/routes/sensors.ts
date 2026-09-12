import { and, desc, eq, gte } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PresenceEventCreateSchema, SensorSummaryCreateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { baselines, devices, sensorSummaries } from '../../db/schema/index.js';
import { requireDogOwnership } from '../middleware/authorization.js';
import { toOwnerAuthorizedBaselineExport } from '../services/data-export-policy.js';
import { parseLookbackWindow } from '../utils/temporal-window.js';

const sensors = new Hono();

const PRESENCE_PERSISTENCE_NOT_READY = 'PRESENCE_PERSISTENCE_NOT_READY' as const;
const ELI_RUNTIME_NOT_IMPLEMENTED = 'ELI_RUNTIME_NOT_IMPLEMENTED' as const;

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

function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (input === undefined || input === null) return null;
    if (input instanceof Date) return input.toISOString();
    if (typeof input === 'number' && Number.isFinite(input)) {
      // PostgreSQL REAL is float32. Normalize only representational round-trip
      // noise so an identical logical retry is not misclassified as conflict.
      return Number(input.toPrecision(7));
    }
    if (Array.isArray(input)) return input.map(normalize);
    if (typeof input === 'object') {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, nested]) => [key, normalize(nested)]),
      );
    }
    return input;
  };

  return JSON.stringify(normalize(value));
}

function summaryRetryFingerprint(
  row: {
    dogId: string;
    deviceId: string | null;
    timestamp: Date;
    source: string;
    matPresenceMinutes: number | null;
    respiratoryRateMean: number | null;
    respiratoryRateStd: number | null;
    respiratoryRateConfidence: number | null;
    weightKg: number | null;
    positionChanges: number | null;
    activityMinutes: number | null;
    distanceKm: number | null;
    vocalEvents: number | null;
    vocalEnergyMean: number | null;
    postureDistribution: unknown;
    agitationEvents: number | null;
    temperatureC: number | null;
    humidityPct: number | null;
  },
): string {
  return canonicalJson({
    dogId: row.dogId,
    deviceId: row.deviceId,
    timestamp: row.timestamp,
    source: row.source,
    matPresenceMinutes: row.matPresenceMinutes,
    respiratoryRateMean: row.respiratoryRateMean,
    respiratoryRateStd: row.respiratoryRateStd,
    respiratoryRateConfidence: row.respiratoryRateConfidence,
    weightKg: row.weightKg,
    positionChanges: row.positionChanges,
    activityMinutes: row.activityMinutes,
    distanceKm: row.distanceKm,
    vocalEvents: row.vocalEvents,
    vocalEnergyMean: row.vocalEnergyMean,
    postureDistribution: row.postureDistribution,
    agitationEvents: row.agitationEvents,
    temperatureC: row.temperatureC,
    humidityPct: row.humidityPct,
  });
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

function eliRuntimeUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  dogId: string,
  operation: 'get_latest_eli_state' | 'list_eli_history',
): Response {
  c.header('Cache-Control', 'private, no-store');
  return c.json({
    error: 'eli_runtime_not_implemented',
    code: ELI_RUNTIME_NOT_IMPLEMENTED,
    dogId,
    operation,
    maturity: 'NOT_IMPLEMENTED',
    retryable: false,
  }, 501);
}

sensors.post('/summaries', zValidator('json', SensorSummaryCreateSchema), async (c) => {
  const body = c.req.valid('json');
  const denied = await requireDogOwnership(c, body.dogId);
  if (denied) return denied;

  try {
    let boundDevice: { id: string; firmwareVersion: string | null } | null = null;
    if (body.deviceId) {
      const [device] = await db
        .select({
          id: devices.id,
          firmwareVersion: devices.firmwareVersion,
        })
        .from(devices)
        .where(and(
          eq(devices.id, body.deviceId),
          eq(devices.dogId, body.dogId),
          eq(devices.type, body.source),
        ))
        .limit(1);

      if (!device) {
        return c.json({
          error: 'device_id is not bound to this dog/source',
          code: 'SENSOR_DEVICE_BINDING_INVALID',
        }, 400);
      }
      boundDevice = device;
    }

    const values = {
      dogId: body.dogId,
      ingestionId: body.ingestionId,
      deviceId: boundDevice?.id,
      timestamp: body.timestamp,
      source: body.source,
      firmwareVersionAtIngest: boundDevice?.firmwareVersion,
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
    };

    const [created] = body.ingestionId
      ? await db
          .insert(sensorSummaries)
          .values(values)
          .onConflictDoNothing({ target: sensorSummaries.ingestionId })
          .returning()
      : await db
          .insert(sensorSummaries)
          .values(values)
          .returning();

    if (!created && body.ingestionId) {
      const [existing] = await db
        .select()
        .from(sensorSummaries)
        .where(and(
          eq(sensorSummaries.ingestionId, body.ingestionId),
          eq(sensorSummaries.dogId, body.dogId),
        ))
        .limit(1);

      if (!existing) {
        return c.json({
          error: 'ingestion_id already belongs to another summary',
          code: 'SENSOR_INGESTION_ID_CONFLICT',
        }, 409);
      }

      const expectedFingerprint = summaryRetryFingerprint({
        dogId: body.dogId,
        deviceId: boundDevice?.id ?? null,
        timestamp: body.timestamp,
        source: body.source,
        matPresenceMinutes: body.matPresenceMinutes ?? null,
        respiratoryRateMean: body.respiratoryRate?.mean ?? null,
        respiratoryRateStd: body.respiratoryRate?.std ?? null,
        respiratoryRateConfidence: body.respiratoryRate?.confidence ?? null,
        weightKg: body.weightKg ?? null,
        positionChanges: body.positionChanges ?? null,
        activityMinutes: body.activityMinutes ?? null,
        distanceKm: body.distanceKm ?? null,
        vocalEvents: body.vocalEvents ?? null,
        vocalEnergyMean: body.vocalEnergyMean ?? null,
        postureDistribution: body.postureDistribution ?? null,
        agitationEvents: body.agitationEvents ?? null,
        temperatureC: body.temperatureC ?? null,
        humidityPct: body.humidityPct ?? null,
      });

      const actualFingerprint = summaryRetryFingerprint(existing);
      if (actualFingerprint !== expectedFingerprint) {
        return c.json({
          error: 'ingestion_id was reused with a different summary payload',
          code: 'SENSOR_INGESTION_ID_CONFLICT',
        }, 409);
      }

      return c.json({ summary: existing, idempotentReplay: true }, 200);
    }

    if (!created) return databaseUnavailable(c, 'create_sensor_summary');
    return c.json({ summary: created, idempotentReplay: false }, 201);
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

  // Persistence schema alone is not a live ELI producer. Until one authoritative
  // orchestration/projection path exists under #118/#124, fail honestly rather
  // than expose whatever historical/internal row may happen to be persisted.
  return eliRuntimeUnavailable(c, dogId, 'get_latest_eli_state');
});

sensors.get('/eli/:dogId/history', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  return eliRuntimeUnavailable(c, dogId, 'list_eli_history');
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
      baseline: baseline ? toOwnerAuthorizedBaselineExport(baseline) : null,
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

  const window = parseLookbackWindow(c.req.query('days'));
  if (!window) {
    return c.json({ error: 'invalid_presence_window', parameter: 'days' }, 400);
  }

  return presencePersistenceUnavailable(c, 'list_presence_events');
});

export { sensors, PRESENCE_PERSISTENCE_NOT_READY, ELI_RUNTIME_NOT_IMPLEMENTED };
