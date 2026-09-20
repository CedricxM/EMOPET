import { Hono } from 'hono';
import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, devices } from '../../db/schema/dogs.js';
import { baselines, eliStates, sensorSummaries } from '../../db/schema/sensors.js';
import { parseExportInterval } from '../utils/export-interval.js';

interface Variables {
  userId: string;
}

interface ExportProvenance {
  source: 'EMOPET_BACKEND';
  generatedAt: string;
  schemaVersion: 'p0-data-act-v1';
  notes: string[];
}

/**
 * Producer status of each publication level, on the backend as it currently stands.
 *
 * A persistence schema is not a producer. `sensor_summaries`, `eli_states`,
 * `baselines` and `devices` are declared in `db/schema/` and are read here, but
 * no module under `api/` writes to any of them: `POST /sensors/summaries` still
 * returns `ingested` from a `TODO` stub without persisting.
 *
 * `inferred` is the structural case rather than a work-in-progress one. The
 * canonical engine `@emopet/eli-engine` is a declared dependency of this package
 * and is imported by no backend module, so nothing produces `eli_states` rows.
 * That gate is ELI-ARCH-01 (#118) and is still open.
 *
 * Consequence for portability: an empty export from this endpoint means "this
 * backend has no writer for that level", NOT "nothing was observed about this
 * dog". Those two statements are not interchangeable and the envelope must not
 * let a reader confuse them.
 *
 * Maturity: `NO_PERSISTING_WRITER_OBSERVED` is an observation dated below, not a
 * product decision about which levels should exist; update the matching entry in
 * the same change that lands an ingestion writer.
 */
export const EXPORT_LEVEL_PRODUCER_STATUS = {
  raw: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA',
  preprocessed: 'NO_PERSISTING_WRITER_OBSERVED',
  inferred: 'NO_CANONICAL_ELI_PRODUCER',
  device_metadata: 'NO_PERSISTING_WRITER_OBSERVED',
  baseline: 'NO_PERSISTING_WRITER_OBSERVED',
} as const;

/** Date the statuses above were observed. Dateless status claims go stale silently. */
export const PRODUCER_STATUS_OBSERVED_AT = '2026-09-19';

/** What an empty array for a given level is allowed to be read as. */
export const EMPTY_RESULT_MEANING = 'ABSENCE_OF_WRITER_NOT_ABSENCE_OF_ACTIVITY';

export const dataExport = new Hono<{ Variables: Variables }>();

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
  const interval = parseExportInterval(c.req.query('from'), c.req.query('to'));

  if (!dogId) return c.json({ error: 'dog_id is required' }, 400);
  if (!interval.ok) return c.json({ error: interval.error }, 400);

  const { from, to } = interval;

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
      'No level exported here has a persisting writer in this backend at the declared observation date: an empty result declares the absence of a producer, not the absence of activity. See levelProducerStatus.',
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
    levelProducerStatus: EXPORT_LEVEL_PRODUCER_STATUS,
    producerStatusObservedAt: PRODUCER_STATUS_OBSERVED_AT,
    emptyResultMeaning: EMPTY_RESULT_MEANING,
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
  // Levels this endpoint can shape. Whether anything currently produces them is a
  // separate question, answered by levelProducerStatus rather than left implicit.
  availableLevels: ['preprocessed', 'inferred', 'device_metadata', 'baseline'],
  levelProducerStatus: EXPORT_LEVEL_PRODUCER_STATUS,
  producerStatusObservedAt: PRODUCER_STATUS_OBSERVED_AT,
  emptyResultMeaning: EMPTY_RESULT_MEANING,
}));
