/**
 * Arbitrage de contexte. Fusionne plusieurs lectures providers en UN signal arbitré.
 *
 * Pour le NUMÉRIQUE SÛR (température, humidité, AQI, PM2.5, UV…) : consensus pondéré
 * après retrait des outliers (z-score modifié de Iglewicz-Hoaglin). En cas de
 * désaccord trop fort des inliers → `conflicting_sources`, valeur `null` : on ne
 * force JAMAIS de conclusion. Pour le contexte SENSIBLE, le seuil est durci : tout
 * désaccord notable bascule en incertitude. La provenance est toujours conservée.
 */

import type { ArbitratedSignal, ProvenanceEntry } from '../../api/types';
import { median, weightedMean, type NumericReading } from './evidenceResolver';

export interface NumericArbitrationOptions {
  category: string;
  unit?: string;
  /** Contexte sensible : aucun moyennage si désaccord ; seuil durci. */
  sensitive?: boolean;
  /** Désaccord relatif des inliers au-delà duquel = conflit (def. 0.2). */
  conflictSpread?: number;
  /** Seuil de z-score modifié pour les outliers (def. 3.5). */
  outlierZ?: number;
}

const UNCERTAIN = 'Contexte externe indisponible ou incertain. Aucune interprétation à formuler.';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Z-scores modifiés (robustes) ; MAD nulle → tous à 0 (pas d'outlier). */
function modifiedZScores(values: readonly number[], med: number): number[] {
  const mad = median(values.map((v) => Math.abs(v - med)));
  if (mad === 0) return values.map(() => 0);
  return values.map((v) => (0.6745 * (v - med)) / mad);
}

export function arbitrateNumeric(readings: readonly NumericReading[], opts: NumericArbitrationOptions): ArbitratedSignal<number> {
  const arbitratedAt = new Date().toISOString();
  const warnings: string[] = [];
  const conflictSpread = opts.sensitive ? 0.03 : opts.conflictSpread ?? 0.2;
  const outlierZ = opts.outlierZ ?? 3.5;

  if (readings.length === 0) {
    return { category: opts.category, status: 'insufficient_data', value: null, unit: opts.unit, confidence: 0, recommendation: 'Aucune source disponible.', provenance: [], warnings, arbitratedAt };
  }

  const allStale = readings.every((r) => r.freshness === 'stale');

  if (readings.length === 1) {
    const r = readings[0]!;
    return {
      category: opts.category,
      status: allStale ? 'stale' : 'confirmed',
      value: round2(r.value),
      unit: opts.unit ?? r.unit,
      confidence: clamp01(r.weight * (allStale ? 0.5 : 1)),
      provenance: [{ provider: r.provider, value: r.value, unit: r.unit, weight: r.weight, freshness: r.freshness, usedInConsensus: true }],
      warnings,
      arbitratedAt,
    };
  }

  // ≥ 2 sources : retrait des outliers
  const values = readings.map((r) => r.value);
  const z = modifiedZScores(values, median(values));
  const inliers: NumericReading[] = [];
  const provenance: ProvenanceEntry[] = readings.map((r, i) => {
    const outlier = Math.abs(z[i]!) > outlierZ;
    if (outlier) warnings.push(`outlier_removed: ${r.provider} (${r.value})`);
    else inliers.push(r);
    return { provider: r.provider, value: r.value, unit: r.unit, weight: r.weight, freshness: r.freshness, usedInConsensus: !outlier, outlier };
  });

  if (inliers.length === 0) {
    return { category: opts.category, status: 'conflicting_sources', value: null, unit: opts.unit, confidence: 0.2, recommendation: UNCERTAIN, provenance, warnings, arbitratedAt };
  }

  const inlierValues = inliers.map((r) => r.value);
  const mean = weightedMean(inliers);
  const range = Math.max(...inlierValues) - Math.min(...inlierValues);
  const relRange = Math.abs(mean) > 1e-9 ? range / Math.abs(mean) : range;

  // Désaccord trop fort → incertitude (jamais de conclusion forcée).
  if (relRange > conflictSpread) {
    return { category: opts.category, status: 'conflicting_sources', value: null, unit: opts.unit, confidence: 0.3, recommendation: UNCERTAIN, provenance, warnings, arbitratedAt };
  }

  // Consensus
  const outlierCount = readings.length - inliers.length;
  const avgWeight = inliers.reduce((a, r) => a + r.weight, 0) / inliers.length;
  const agreement = 1 - Math.min(1, relRange / conflictSpread);
  const confidence = clamp01(avgWeight * (0.6 + 0.4 * agreement) * (1 - 0.15 * outlierCount));

  return {
    category: opts.category,
    status: allStale ? 'stale' : 'consensus',
    value: round2(mean),
    unit: opts.unit ?? inliers[0]!.unit,
    confidence,
    provenance,
    warnings,
    arbitratedAt,
  };
}
