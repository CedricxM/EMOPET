import { Hono } from 'hono';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, devices } from '../../db/schema/dogs.js';
import { baselines, eliStates, sensorSummaries } from '../../db/schema/sensors.js';
import { isCanonicalUserId } from '../services/auth-security.js';
import {
  toGuardianAuthorizedBaselineExport,
  toGuardianAuthorizedEliExport,
} from '../services/data-export-policy.js';

interface Variables {
  userId: string;
}

interface ExportProvenance {
  source: 'EMOPET_BACKEND';
  generatedAt: string;
  schemaVersion: 'p0-data-act-v2';
  notes: string[];
}

interface ParsedOptionalDate {
  value: Date | null;
  valid: boolean;
}

export const dataExport = new Hono<{ Variables: Variables }>();

dataExport.use('*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  if (!isCanonicalUserId(c.get('userId'))) return c.json({ error: 'unauthorized' }, 401);
  await next();
});

function parseOptionalDate(value: string | undefined): ParsedOptionalDate {
  if (value === undefined) return { value: null, valid: true };
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? { value: date, valid: true }
    : { value: null, valid: false };
}

function csvField(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  // Quote spreadsheet-like text as a literal, including leading whitespace and
  // full-width formula prefixes. Numeric values (including negatives) stay numeric.
  // This guards the emitted CSV, not arbitrary spreadsheet save/re-open cycles.
  if (typeof value === 'string' && (/^[=+\-@＝＋－＠]/u.test(text.trimStart()) || /^[\t\r\n]/.test(text))) {
    return `"'${text.replace(/"/g, '""')}"`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(envelope: Record<string, unknown>): string {
  const rows: Array<Record<string, unknown>> = [];
  const pushRows = (recordType: string, values: unknown) => {
    if (!Array.isArray(values)) return;
    for (const value of values) rows.push({ record_type: recordType, ...(value as Record<string, unknown>) });
  };

  // JSON already carries the canonical subject profile. CSV must represent the
  // same subject so a later rectification cannot appear corrected in one export
  // format while remaining absent/stale in the other.
  const subject = envelope['subject'];
  if (subject && typeof subject === 'object' && !Array.isArray(subject)) {
    const subjectRecord = subject as Record<string, unknown>;
    const dogProfile = subjectRecord['dogProfile'];
    if (dogProfile && typeof dogProfile === 'object' && !Array.isArray(dogProfile)) {
      rows.push({
        record_type: 'dog_profile',
        userId: subjectRecord['userId'],
        dogId: subjectRecord['dogId'],
        ...(dogProfile as Record<string, unknown>),
      });
    }
  }

  pushRows('device', envelope['devices']);
  pushRows('preprocessed_sensor_summary', envelope['preprocessed']);
  pushRows('inferred_eli_state', envelope['inferred']);
  pushRows('baseline_metadata', envelope['baselines']);

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
 *
 * Persisted derived state is not automatically Guardian-disclosable. ELI and baseline
 * rows pass through explicit Guardian projection functions before JSON/CSV serialization.
 */
dataExport.get('/', async (c) => {
  const userId = c.get('userId');
  const dogId = c.req.query('dog_id');
  const format = c.req.query('format') === 'csv' ? 'csv' : 'json';
  const parsedFrom = parseOptionalDate(c.req.query('from'));
  const parsedTo = parseOptionalDate(c.req.query('to'));

  if (!dogId) return c.json({ error: 'dog_id is required' }, 400);
  if (!isCanonicalUserId(dogId)) return c.json({ error: 'invalid_dog_id' }, 400);
  if (!parsedFrom.valid) return c.json({ error: 'invalid_from' }, 400);
  if (!parsedTo.valid) return c.json({ error: 'invalid_to' }, 400);

  const from = parsedFrom.value;
  const to = parsedTo.value;
  if (from && to && from.getTime() > to.getTime()) {
    return c.json({ error: 'invalid_interval', reason: 'from_after_to' }, 400);
  }

  const timestampFilters = [eq(sensorSummaries.dogId, dogId)];
  if (from) timestampFilters.push(gte(sensorSummaries.timestamp, from));
  if (to) timestampFilters.push(lte(sensorSummaries.timestamp, to));

  const eliFilters = [eq(eliStates.dogId, dogId)];
  if (from) eliFilters.push(gte(eliStates.timestamp, from));
  if (to) eliFilters.push(lte(eliStates.timestamp, to));

  const readExport = () => db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
    // Ownership is consumed in the same transaction as all export reads.
    // FOR SHARE waits for an in-flight transfer, rechecks the owner, and blocks
    // later transfers/deletion until collection completes. KEY SHARE is weaker.
    const [ownedDog] = await tx.select().from(dogs)
      .where(and(eq(dogs.id, dogId), eq(dogs.ownerId, userId))).limit(1).for('share');
    if (!ownedDog) return null;

    const deviceRows = await tx.select().from(devices).where(eq(devices.dogId, dogId)).orderBy(asc(devices.id));
    const summaryRows = await tx.select().from(sensorSummaries).where(and(...timestampFilters))
      .orderBy(asc(sensorSummaries.timestamp), asc(sensorSummaries.id));
    const eliRows = await tx.select().from(eliStates).where(and(...eliFilters))
      .orderBy(asc(eliStates.timestamp), asc(eliStates.id));
    const baselineRows = await tx.select().from(baselines).where(eq(baselines.dogId, dogId));
    return { ownedDog, deviceRows, summaryRows, eliRows, baselineRows };
  }, { isolationLevel: 'read committed' });

  let exportedRows: Awaited<ReturnType<typeof readExport>>;
  try {
    exportedRows = await readExport();
  } catch {
    return c.json({
      error: 'data_export_unavailable', code: 'DATA_EXPORT_UNAVAILABLE', retryable: true,
    }, 503);
  }
  if (!exportedRows) return c.json({ error: 'Dog not found' }, 404);
  const { ownedDog, deviceRows, summaryRows, eliRows, baselineRows } = exportedRows;

  const provenance: ExportProvenance = {
    source: 'EMOPET_BACKEND',
    generatedAt: new Date().toISOString(),
    schemaVersion: 'p0-data-act-v2',
    notes: [
      'This export contains only records currently persisted by the EMOPET backend.',
      'Raw high-rate MAT/TAG streams are not persisted by the current backend schema and are therefore not fabricated.',
      'ELI states are inferred/derived data and are separated from preprocessed sensor summaries.',
      'Guardian inferred export is publication-gated: internal valence/arousal state is excluded and ELI load is exported only when gateStatus=PUBLISH.',
      'Baseline lifecycle metadata is exposed, but opaque baseline metrics are withheld pending explicit Guardian disclosure authority.',
    ],
  };

  const envelope = {
    exportVersion: 'p0-data-act-v2',
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
    inferred: eliRows.map(toGuardianAuthorizedEliExport),
    baselines: baselineRows.map(toGuardianAuthorizedBaselineExport),
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
 * users can already obtain a JSON/CSV package without that dependency.
 */
dataExport.get('/capabilities', (c) => c.json({
  exportVersion: 'p0-data-act-v2',
  formats: ['json', 'csv'],
  filters: ['dog_id', 'from', 'to'],
  directThirdPartyDelegation: 'GATED_AUTH_BASELINE_REQUIRED',
  rawHighRateStreams: 'NOT_PERSISTED_BY_CURRENT_BACKEND_SCHEMA',
  baselineMetricDisclosurePolicy: 'WITHHELD_PENDING_DISCLOSURE_AUTHORITY',
  csvTextPolicy: 'FORMULA_LIKE_TEXT_PREFIXED_WITH_APOSTROPHE',
  availableLevels: ['dog_profile', 'preprocessed', 'inferred', 'device_metadata', 'baseline_metadata'],
}));
