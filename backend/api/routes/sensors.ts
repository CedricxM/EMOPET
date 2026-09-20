import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { PresenceEventCreateSchema, SensorSummaryCreateSchema } from '@emopet/shared';

import { db } from '../../db/index.js';
import { devices, dogs, sensorSummaries } from '../../db/schema/index.js';
import { getCurrentUserId, requireDogOwnership } from '../middleware/authorization.js';
import { parseLookbackWindow } from '../utils/temporal-window.js';

const sensors = new Hono();

const PRESENCE_PERSISTENCE_NOT_READY = 'PRESENCE_PERSISTENCE_NOT_READY' as const;

const SENSOR_PROVENANCE_REQUIRED = 'SENSOR_PROVENANCE_REQUIRED' as const;
const SENSOR_SOURCE_FIELDS_INVALID = 'SENSOR_SOURCE_FIELDS_INVALID' as const;

const MAT_ONLY_SUMMARY_FIELDS = [
  'matPresenceMinutes',
  'respiratoryRate',
  'weightKg',
  'positionChanges',
] as const;

const TAG_ONLY_SUMMARY_FIELDS = [
  'activityMinutes',
  'distanceKm',
  'vocalEvents',
  'vocalEnergyMean',
  'postureDistribution',
  'agitationEvents',
] as const;

function presencePersistenceUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: 'create_presence_event' | 'list_presence_events',
): Response {
  c.header('Cache-Control', 'private, no-store');
  return c.json({
    error: 'Presence events do not yet have a durable Product V1 persistence authority.',
    code: PRESENCE_PERSISTENCE_NOT_READY,
    operation,
    retryable: false,
  }, 503);
}

function databaseUnavailable(
  c: {
    header: (name: string, value: string) => void;
    json: (value: unknown, status?: number) => Response;
  },
  operation: string,
): Response {
  c.header('Cache-Control', 'private, no-store');
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

function firstDefinedField(
  value: Record<string, unknown>,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    if (value[field] !== undefined) return field;
  }
  return null;
}

function summaryRetryFingerprint(
  row: {
    dogId: string;
    deviceId: string;
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

sensors.post('/summaries', zValidator('json', SensorSummaryCreateSchema), async (c) => {
  c.header('Cache-Control', 'private, no-store');
  const body = c.req.valid('json');
  const userId = getCurrentUserId(c);
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const ingestionId = body.ingestionId;
  const deviceId = body.deviceId;
  if (!ingestionId || !deviceId) {
    return c.json({
      error: 'ingestion_id and device_id are required for durable sensor-summary ingestion',
      code: SENSOR_PROVENANCE_REQUIRED,
      retryable: false,
    }, 400);
  }

  const crossSourceField = firstDefinedField(
    body as Record<string, unknown>,
    body.source === 'MAT' ? TAG_ONLY_SUMMARY_FIELDS : MAT_ONLY_SUMMARY_FIELDS,
  );
  if (crossSourceField) {
    return c.json({
      error: `${crossSourceField} is not valid for ${body.source} sensor summaries`,
      code: SENSOR_SOURCE_FIELDS_INVALID,
      field: crossSourceField,
      source: body.source,
      retryable: false,
    }, 400);
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

      const [dog] = await tx
        .select({ ownerId: dogs.ownerId })
        .from(dogs)
        .where(eq(dogs.id, body.dogId))
        .for('share')
        .limit(1);

      if (!dog || dog.ownerId !== userId) {
        return { kind: 'not_found' as const };
      }

      const [boundDevice] = await tx
        .select({
          id: devices.id,
          firmwareVersion: devices.firmwareVersion,
        })
        .from(devices)
        .where(and(
          eq(devices.id, deviceId),
          eq(devices.dogId, body.dogId),
          eq(devices.type, body.source),
        ))
        .for('share')
        .limit(1);

      if (!boundDevice) return { kind: 'invalid_device' as const };

      const values = {
        dogId: body.dogId,
        ingestionId,
        deviceId: boundDevice.id,
        timestamp: body.timestamp,
        source: body.source,
        firmwareVersionAtIngest: boundDevice.firmwareVersion,
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

      const [created] = await tx
        .insert(sensorSummaries)
        .values(values)
        .onConflictDoNothing({ target: sensorSummaries.ingestionId })
        .returning();

      if (!created) {
        const [existing] = await tx
          .select()
          .from(sensorSummaries)
          .where(and(
            eq(sensorSummaries.ingestionId, ingestionId),
            eq(sensorSummaries.dogId, body.dogId),
          ))
          .limit(1);

        if (!existing) return { kind: 'ingestion_conflict' as const };

        const expectedFingerprint = summaryRetryFingerprint({
          dogId: body.dogId,
          deviceId: boundDevice.id,
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
          return { kind: 'ingestion_conflict' as const };
        }

        return { kind: 'replay' as const, summary: existing };
      }

      return { kind: 'created' as const, summary: created };
    });

    if (result.kind === 'not_found') return c.json({ error: 'not_found' }, 404);
    if (result.kind === 'invalid_device') {
      return c.json({
        error: 'device_id is not bound to this dog/source',
        code: 'SENSOR_DEVICE_BINDING_INVALID',
      }, 400);
    }
    if (result.kind === 'ingestion_conflict') {
      return c.json({
        error: 'ingestion_id was reused with a different summary payload',
        code: 'SENSOR_INGESTION_ID_CONFLICT',
      }, 409);
    }

    return c.json({
      summary: result.summary,
      idempotentReplay: result.kind === 'replay',
    }, result.kind === 'replay' ? 200 : 201);
  } catch {
    return databaseUnavailable(c, 'create_sensor_summary');
  }
});

sensors.get('/summaries/:dogId', async (c) => {
  c.header('Cache-Control', 'private, no-store');
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = parseRange(c.req.query('range'));
  if (!range) {
    return c.json({ error: 'range must be one of 1h, 6h, 12h, 24h, 48h, 72h, 7d, 14d, 30d' }, 400);
  }

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

  // No canonical ELI producer/runtime is wired. Do not represent
  // NOT_IMPLEMENTED as an authoritative successful no-result.
  return c.json({ error: 'eli_runtime_not_implemented', dogId }, 501);
});

sensors.get('/eli/:dogId/history', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  const range = c.req.query('range') ?? '7d';
  // Keep the requested range visible as request context without claiming it
  // was queried against an authoritative ELI runtime.
  return c.json({ error: 'eli_runtime_not_implemented', dogId, range }, 501);
});

sensors.get('/baseline/:dogId', async (c) => {
  const dogId = c.req.param('dogId');
  const denied = await requireDogOwnership(c, dogId);
  if (denied) return denied;

  // Baseline persistence exists, but no authoritative Owner-facing projection
  // is wired here. Do not represent NOT_IMPLEMENTED as a successful null read.
  return c.json({ error: 'baseline_read_not_implemented', dogId }, 501);
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

export { sensors, SENSOR_PROVENANCE_REQUIRED, SENSOR_SOURCE_FIELDS_INVALID };
