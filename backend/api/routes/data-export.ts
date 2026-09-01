import { Hono } from 'hono';
import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, devices } from '../../db/schema/dogs.js';
import { baselines, eliStates, sensorSummaries } from '../../db/schema/sensors.js';
import {
  exportEnvelopeToCsv,
  serializeBaselineForGuardianExport,
  serializeEliForGuardianExport,
} from '../services/data-export-policy.js';

interface Variables {
  userId: string;
}

interface ExportProvenance {
  source: 'EMOPET_BACKEND';
  generatedAt: string;
  schemaVersion: 'p0-data-act-v3';
  notes: string[];
}

export const dataExport = new Hono<{ Variables: Variables }>();

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Data Act / portability export for data currently available to the EMOPET backend.
 *
 * Important: the current backend schema does not persist raw high-rate MAT/TAG streams.
 * This endpoint therefore reports raw data as unavailable rather than fabricating it.
 * If/when raw streams become part of the production data plane they must be added here
 * with units, timestamps, quality flags and device/firmware provenance.
 *
 * Derived ELI persistence is deliberately not exposed wholesale. The Guardian-facing
 * serializer enforces the current scientific publication boundary independently of the
 * database schema so internal/gated model variables cannot leak merely because they are
 * persisted.
 *
 * Baseline persistence is likewise not treated as automatic disclosure authority. The
 * export currently exposes lifecycle/establishment metadata but withholds the opaque
 * baseline `metrics` payload until a controlled Guardian disclosure policy exists.
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
    schemaVersion: 'p0-data-act-v3',
    notes: [
      'This export contains only records currently persisted by the EMOPET backend.',
      'Raw high-rate MAT/TAG streams are not persisted by the current backend schema and are therefore not fabricated.',
      'ELI states are inferred/derived data and are separated from preprocessed sensor summaries.',
      'Valence is an internal V1 model variable and is intentionally excluded from Guardian exports under the current scientific publication authority.',
      'Arousal/load values are exported only for ELI states whose publication gate is PUBLISH; other rows retain quality/gate metadata without latent values.',
      'Baseline lifecycle metadata may be exported voluntarily, but the opaque baseline metrics payload is withheld pending explicit Guardian disclosure authority.',
    ],
  };

  const envelope = {
    exportVersion: 'p0-data-act-v3',
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
    inferred: eliRows.map(serializeEliForGuardianExport),
    baselines: baselineRows.map(serializeBaselineForGuardianExport),
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
    const csv = exportEnvelopeToCsv(envelope);
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
 * users can already obtain a JSON/CSV package without that dependency.
 */
dataExport.get('/capabilities', (c) => c.json({
  exportVersion: 'p0-data-act-v3',
  formats: ['json', 'csv'],
  filters: ['dog_id', 'from', 'to'],
  directThirdPartyDelegation: 'GATED_AUTH_BASELINE_REQUIRED',
  rawHighRateStreams: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA',
  inferredDisclosurePolicy: 'GUARDIAN_V1_PUBLICATION_GATED',
  baselineMetricDisclosurePolicy: 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY',
  availableLevels: ['preprocessed', 'inferred', 'device_metadata', 'baseline_metadata'],
}));
