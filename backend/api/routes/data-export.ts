import { Hono } from 'hono';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, devices } from '../../db/schema/dogs.js';
import { baselines, eliStates, sensorSummaries } from '../../db/schema/sensors.js';

interface Variables {
  userId: string;
}

interface ExportProvenance {
  source: 'EMOPET_BACKEND';
  generatedAt: string;
  schemaVersion: 'p0-data-act-v1';
  notes: string[];
}

export const dataExport = new Hono<{ Variables: Variables }>();

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function csvField(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(envelope: Record<string, unknown>): string {
  const rows: Array<Record<string, unknown>> = [];
  const pushRows = (recordType: string, values: unknown) => {
    if (!Array.isArray(values)) return;
    for (const value of values) rows.push({ record_type: recordType, ...(value as Record<string, unknown>) });
  };

  pushRows('device', envelope['devices']);
  pushRows('preprocessed_sensor_summary', envelope['preprocessed']);
  pushRows('inferred_eli_state', envelope['inferred']);
  pushRows('baseline', envelope['baselines']);

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.map(csvField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvField(row[header])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Data Act / portability export for data currently available to the EMOPET backend.
 *
 * Important: the current backend schema does not persist raw high-rate MAT/TAG streams.
 * This endpoint therefore reports raw data as unavailable rather than fabricating it.
 * If/when raw streams become part of the production data plane they must be added here
 * with units, timestamps, quality flags and device/firmware provenance.
 */
dataExport.get('/', async (c) => {
  const userId = c.get('userId');
  const dogId = c.req.query('dog_id');
  const format = c.req.query('format') === 'csv' ? 'csv' : 'json';
  const from = parseDate(c.req.query('from'));
  const to = parseDate(c.req.query('to'));

  if (!dogId) return c.json({ error: 'dog_id is required' }, 400);

  const ownedDog = await db.query.dogs.findFirst({
    where: and(eq(dogs.id, dogId), eq(dogs.ownerId, userId)),
  });
  if (!ownedDog) return c.json({ error: 'Dog not found' }, 404);

  const timestampFilters = [eq(sensorSummaries.dogId, dogId)];
  if (from) timestampFilters.push(gte(sensorSummaries.timestamp, from));
  if (to) timestampFilters.push(lte(sensorSummaries.timestamp, to));

  const eliFilters = [eq(eliStates.dogId, dogId)];
  if (from) eliFilters.push(gte(eliStates.timestamp, from));
  if (to) eliFilters.push(lte(eliStates.timestamp, to));

  const [deviceRows, summaryRows, eliRows, baselineRows] = await Promise.all([
    db.select().from(devices).where(eq(devices.dogId, dogId)),
    db.select().from(sensorSummaries).where(and(...timestampFilters)),
    db.select().from(eliStates).where(and(...eliFilters)),
    db.select().from(baselines).where(eq(baselines.dogId, dogId)),
  ]);

  const provenance: ExportProvenance = {
    source: 'EMOPET_BACKEND',
    generatedAt: new Date().toISOString(),
    schemaVersion: 'p0-data-act-v1',
    notes: [
      'This export contains only records currently persisted by the EMOPET backend.',
      'Raw high-rate MAT/TAG streams are not persisted by the current backend schema and are therefore not fabricated.',
      'ELI states are inferred/derived data and are separated from preprocessed sensor summaries.',
    ],
  };

  const envelope = {
    exportVersion: 'p0-data-act-v1',
    generatedAt: provenance.generatedAt,
    subject: {
      userId,
      dogId: ownedDog.id,
      dogProfile: {
        id: ownedDog.id,
        name: ownedDog.name,
        breed: ownedDog.breed,
        birthDate: ownedDog.birthDate,
        sex: ownedDog.sex,
        weightKg: ownedDog.weight,
      },
    },
    interval: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    raw: [],
    rawDataStatus: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA',
    preprocessed: summaryRows.map((row) => ({
      ...row,
      units: {
        matPresenceMinutes: 'min',
        respiratoryRateMean: 'breaths/min',
        respiratoryRateStd: 'breaths/min',
        weightKg: 'kg',
        activityMinutes: 'min',
        distanceKm: 'km',
        temperatureC: 'degC',
        humidityPct: '%',
      },
      quality: {
        respiratoryRateConfidence: row.respiratoryRateConfidence,
      },
      provenance: {
        deviceSource: row.source,
        level: 'preprocessed',
      },
    })),
    inferred: eliRows.map((row) => ({
      ...row,
      provenance: {
        level: 'inferred',
        warning: 'Derived ELI output; do not treat as raw sensor data or a veterinary diagnosis.',
      },
    })),
    baselines: baselineRows,
    devices: deviceRows.map((row) => ({
      id: row.id,
      dogId: row.dogId,
      type: row.type,
      firmwareVersion: row.firmwareVersion,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
      // Deliberately excludes MAC address from portability output by default.
    })),
    provenance,
  };

  if (format === 'csv') {
    const csv = toCsv(envelope);
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="emopet-${dogId}-data-export.csv"`);
    return c.body(csv);
  }

  c.header('Content-Disposition', `attachment; filename="emopet-${dogId}-data-export.json"`);
  return c.json(envelope);
});

/**
 * Machine-readable capabilities endpoint for clients and third-party portability flows.
 * Direct third-party token delegation remains gated on the production auth/session slice;
 * users can already obtain a complete JSON/CSV package without that dependency.
 */
dataExport.get('/capabilities', (c) => c.json({
  exportVersion: 'p0-data-act-v1',
  formats: ['json', 'csv'],
  filters: ['dog_id', 'from', 'to'],
  directThirdPartyDelegation: 'GATED_AUTH_BASELINE_REQUIRED',
  rawHighRateStreams: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA',
  availableLevels: ['preprocessed', 'inferred', 'device_metadata', 'baseline'],
}));
