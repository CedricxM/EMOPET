import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, sensorSummaries } from '../../db/schema/index.js';
import type { ProfessionalShareReadDecision } from './professional-share-access.js';
import type { VetReportSummary, VetTrendLine } from './vet-report.js';

type ShareTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuthorizedDecision = Extract<ProfessionalShareReadDecision, { allowed: true }>;
type SensorSummaryRow = typeof sensorSummaries.$inferSelect;

export interface ProfessionalShareVetSnapshotContext {
  tx: ShareTransaction;
  authorization: AuthorizedDecision;
}

const MS_PER_DAY = 86_400_000;

type MaybeNumber = number | null | undefined;

// These metrics accept measured zero; absence must never fabricate zero.
function isMeasured(value: MaybeNumber): value is number {
  return value !== null && value !== undefined;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toTrendLabel(firstHalf: MaybeNumber, secondHalf: MaybeNumber): string {
  if (firstHalf == null || secondHalf == null) return 'donnees insuffisantes';
  const delta = secondHalf - firstHalf;
  if (Math.abs(delta) < 0.1) return 'stable';
  return delta > 0 ? 'en hausse douce' : 'en retrait doux';
}

function formatMetricLine(label: string, values: number[], unit: string): VetTrendLine {
  const midpoint = Math.floor(values.length / 2);
  const firstHalf = average(values.slice(0, midpoint || values.length));
  const secondHalf = average(values.slice(midpoint || values.length));
  const latest = values.length > 0 ? round(values[values.length - 1]!) : null;

  return {
    label,
    value: latest == null ? 'donnees insuffisantes' : `${latest}${unit}`,
    coverage: toTrendLabel(firstHalf, secondHalf),
  };
}

function distinctUtcDays(rows: SensorSummaryRow[]): number {
  return new Set(rows.map((row) => row.timestamp.toISOString().slice(0, 10))).size;
}

function coveredCalendarDays(from: Date, to: Date): number {
  const startDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const endDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(1, Math.floor((endDay - startDay) / MS_PER_DAY) + 1);
}

function buildTrends(summaries: SensorSummaryRow[]): VetTrendLine[] {
  const trends: VetTrendLine[] = [
    formatMetricLine(
      'Activite',
      summaries.map((item) => item.distanceKm).filter(isMeasured),
      ' km',
    ),
    formatMetricLine(
      'Repos mat',
      summaries.map((item) => item.matPresenceMinutes).filter(isMeasured),
      ' min',
    ),
    formatMetricLine(
      'Vocalisations',
      summaries.map((item) => item.vocalEvents).filter(isMeasured),
      ' evt',
    ),
    formatMetricLine(
      'Poids',
      summaries.map((item) => item.weightKg ?? 0).filter((value) => value > 0),
      ' kg',
    ),
  ];

  const respiratoryRates = summaries
    .filter((item) => (item.respiratoryRateConfidence ?? 0) >= 0.7)
    .map((item) => item.respiratoryRateMean ?? 0)
    .filter((value) => value > 0);
  trends.push(formatMetricLine('Respiration au repos', respiratoryRates, ' rpm'));

  return trends;
}

/**
 * Build the internal professional-share snapshot from the exact authorized data
 * window. This is deliberately separate from the legacy "last N days" report
 * loader: recipient sharing must have both a lower and an upper SQL bound.
 *
 * Owner notes are not queried at all. Their professional-sharing scope remains
 * unavailable, so reading them merely to discard them would violate data
 * minimization and make future projection mistakes more dangerous.
 */
export async function collectProfessionalShareVetSnapshot({
  tx,
  authorization,
}: ProfessionalShareVetSnapshotContext): Promise<VetReportSummary> {
  const from = new Date(authorization.dataFrom);
  const to = new Date(authorization.dataTo);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to < from) {
    throw new Error('Invalid authorized professional-share data window.');
  }

  const [dog] = await tx
    .select({ name: dogs.name })
    .from(dogs)
    .where(eq(dogs.id, authorization.dogId))
    .limit(1);

  const summaries = await tx
    .select()
    .from(sensorSummaries)
    .where(and(
      eq(sensorSummaries.dogId, authorization.dogId),
      gte(sensorSummaries.timestamp, from),
      lte(sensorSummaries.timestamp, to),
    ))
    .orderBy(sensorSummaries.timestamp);

  const days = coveredCalendarDays(from, to);
  const validDays = distinctUtcDays(summaries);

  return {
    dogId: authorization.dogId,
    dogName: dog?.name ?? 'Votre chien',
    days,
    generatedAt: new Date(),
    coverage: {
      validDays,
      totalDays: days,
      coverageRatio: days === 0 ? 0 : round(validDays / days),
    },
    trends: buildTrends(summaries),
    ownerNotes: [],
  };
}
