import * as jose from 'jose';
import { and, desc, eq, gte } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { dogs, healthEntries, sensorSummaries } from '../../db/schema/index.js';

function resolveReportSecret(): Uint8Array {
  const secret = (process.env['REPORT_SHARE_SECRET'] ?? process.env['JWT_SECRET'])?.trim();
  const isTest = process.env['NODE_ENV'] === 'test';
  if (!secret || secret === 'dev-report-secret' || secret === 'dev-secret-change-in-production') {
    if (isTest) {
      return new TextEncoder().encode('dev-report-secret');
    }
    throw new Error('REPORT_SHARE_SECRET or JWT_SECRET must be configured outside NODE_ENV=test');
  }
  return new TextEncoder().encode(secret);
}

const REPORT_SECRET = resolveReportSecret();

export interface VetReportCoverage {
  validDays: number;
  totalDays: number;
  coverageRatio: number;
}

export interface VetTrendLine {
  label: string;
  value: string;
  coverage: string;
}

export interface VetReportSummary {
  dogId: string;
  dogName: string;
  days: number;
  generatedAt: Date;
  coverage: VetReportCoverage;
  trends: VetTrendLine[];
  ownerNotes: string[];
}

type MaybeNumber = number | null | undefined;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toTrendLabel(firstHalf: MaybeNumber, secondHalf: MaybeNumber): string {
  if (firstHalf == null || secondHalf == null) {
    return 'donnees insuffisantes';
  }

  const delta = secondHalf - firstHalf;
  if (Math.abs(delta) < 0.1) {
    return 'stable';
  }

  return delta > 0 ? 'en hausse douce' : 'en retrait doux';
}

function distinctDays(timestamps: Date[]): number {
  return new Set(
    timestamps.map((date) => {
      const value = new Date(date);
      value.setHours(0, 0, 0, 0);
      return value.toISOString();
    }),
  ).size;
}

function escapePdf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function buildMinimalPdf(lines: string[]): Buffer {
  const commands = ['BT', '/F1 11 Tf', '48 800 Td'];
  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push('0 -16 Td');
    }
    commands.push(`(${escapePdf(line)}) Tj`);
  });
  commands.push('ET');

  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}\nendstream\nendobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function formatMetricLine(
  label: string,
  values: number[],
  unit: string,
): VetTrendLine {
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

export async function loadVetReportSummary(
  dogId: string,
  days: number,
): Promise<VetReportSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let dogName = 'Votre chien';
  let summaries: Array<typeof sensorSummaries.$inferSelect> = [];
  let notes: Array<typeof healthEntries.$inferSelect> = [];

  try {
    const dogRows = await db.select().from(dogs).where(eq(dogs.id, dogId)).limit(1);
    dogName = dogRows[0]?.name ?? dogName;

    summaries = await db
      .select()
      .from(sensorSummaries)
      .where(and(eq(sensorSummaries.dogId, dogId), gte(sensorSummaries.timestamp, since)))
      .orderBy(sensorSummaries.timestamp);

    notes = await db
      .select()
      .from(healthEntries)
      .where(and(eq(healthEntries.dogId, dogId), gte(healthEntries.createdAt, since)))
      .orderBy(desc(healthEntries.createdAt))
      .limit(5);
  } catch {
    summaries = [];
    notes = [];
  }

  const coverage: VetReportCoverage = {
    validDays: distinctDays(summaries.map((item) => item.timestamp)),
    totalDays: days,
    coverageRatio: days === 0 ? 0 : round(distinctDays(summaries.map((item) => item.timestamp)) / days),
  };

  const trends: VetTrendLine[] = [
    formatMetricLine(
      'Activite',
      summaries.map((item) => item.distanceKm ?? 0).filter((value) => value > 0),
      ' km',
    ),
    formatMetricLine(
      'Repos mat',
      summaries.map((item) => item.matPresenceMinutes ?? 0).filter((value) => value > 0),
      ' min',
    ),
    formatMetricLine(
      'Vocalisations',
      summaries.map((item) => item.vocalEvents ?? 0),
      ' evt',
    ),
    formatMetricLine(
      'Poids',
      summaries.map((item) => item.weightKg ?? 0).filter((value) => value > 0),
      ' kg',
    ),
  ];

  const rrValues = summaries
    .filter((item) => (item.respiratoryRateConfidence ?? 0) >= 0.7)
    .map((item) => item.respiratoryRateMean ?? 0)
    .filter((value) => value > 0);
  trends.push(formatMetricLine('Respiration au repos', rrValues, ' rpm'));

  const ownerNotes = notes.length > 0
    ? notes.map((entry) => `${entry.date}: ${entry.title}${entry.details ? ` - ${entry.details}` : ''}`)
    : ['Aucune note proprietaire recente.'];

  return {
    dogId,
    dogName,
    days,
    generatedAt: new Date(),
    coverage,
    trends,
    ownerNotes,
  };
}

export function buildVetReportPdf(summary: VetReportSummary): Buffer {
  const lines = [
    'EMOPET - Rapport veterinaire passif (non medical)',
    `Chien: ${summary.dogName}`,
    `Periode: ${summary.days} jours`,
    `Genere le: ${summary.generatedAt.toISOString().slice(0, 10)}`,
    `Couverture de donnees: ${summary.coverage.validDays}/${summary.coverage.totalDays} jours valides (${Math.round(summary.coverage.coverageRatio * 100)}%)`,
    '',
    'Tendances de synthese:',
    ...summary.trends.map(
      (trend) => `- ${trend.label}: ${trend.value} (${trend.coverage})`,
    ),
    '',
    'Notes proprietaire:',
    ...summary.ownerNotes.slice(0, 4).map((note) => `- ${note}`),
    '',
    'Disclaimers:',
    '- Ce document est informatif et non medical.',
    '- Il ne constitue ni un avis clinique ni une prescription.',
    '- Pour toute inquietude, consultez votre veterinaire.',
    '- Seules les donnees utiles a la lecture du quotidien sont incluses.',
  ];

  return buildMinimalPdf(lines);
}

export async function createVetReportShareToken(
  userId: string,
  dogId: string,
  days: number,
): Promise<string> {
  return new jose.SignJWT({ dogId, days, scope: 'vet-report' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(REPORT_SECRET);
}

export async function verifyVetReportShareToken(
  token: string,
  dogId: string,
  days: number,
): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, REPORT_SECRET);
    return payload['dogId'] === dogId && payload['days'] === days && payload['scope'] === 'vet-report';
  } catch {
    return false;
  }
}
