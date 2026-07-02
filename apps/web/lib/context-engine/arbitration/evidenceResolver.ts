/**
 * Résolution de preuves : extrait des lectures numériques ALIGNÉES depuis des
 * `ContextSignal`, en pondérant par la confiance source (trust) × fraîcheur ×
 * confiance du signal. Fournit aussi médiane / moyenne pondérée pour l'arbitrage.
 */

import type { ContextSignal, Freshness } from '../../api/types';
import { trustWeight } from '../scoring/providerTrust';

export interface NumericReading {
  provider: string;
  value: number;
  unit?: string;
  freshness: Freshness;
  /** Poids effectif (trust × fraîcheur × confiance), borné ≥ 0.01. */
  weight: number;
  timestamp: string;
}

export function freshnessFactor(f: Freshness): number {
  switch (f) {
    case 'fresh':
      return 1;
    case 'acceptable':
      return 0.8;
    case 'stale':
      return 0.4;
    default:
      return 0.6;
  }
}

/**
 * Extrait des lectures numériques depuis des signaux via un accesseur `valueOf`.
 * Ignore silencieusement les signaux dont la valeur n'est pas un nombre fini.
 */
export function toNumericReadings<T>(
  signals: ReadonlyArray<ContextSignal<T>>,
  category: string,
  valueOf: (value: T) => number | undefined,
): NumericReading[] {
  const readings: NumericReading[] = [];
  for (const s of signals) {
    const n = valueOf(s.value);
    if (typeof n === 'number' && Number.isFinite(n)) {
      const w = trustWeight(category, s.provider) * freshnessFactor(s.freshness) * (s.confidence || 0.5);
      readings.push({ provider: s.provider, value: n, unit: s.unit, freshness: s.freshness, weight: Math.max(0.01, w), timestamp: s.timestamp });
    }
  }
  return readings;
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function weightedMean(readings: readonly NumericReading[]): number {
  const wsum = readings.reduce((acc, r) => acc + r.weight, 0);
  if (wsum === 0) return Number.NaN;
  return readings.reduce((acc, r) => acc + r.value * r.weight, 0) / wsum;
}
