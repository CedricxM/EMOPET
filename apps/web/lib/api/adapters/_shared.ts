/**
 * Helpers partagés par les adaptateurs : construction de `ContextSignal`, fraîcheur,
 * bornage de confiance. Évite la duplication ; un signal est toujours construit ici.
 */

import type { ContextSignal, Freshness, SignalLocation, SourceType } from '../types';

export function nowIso(): string {
  return new Date().toISOString();
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Classe la fraîcheur selon l'âge de la donnée (réception − horodatage). */
export function freshnessFromAgeMs(ageMs: number): Freshness {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown';
  if (ageMs <= 60 * 60_000) return 'fresh'; // ≤ 1 h
  if (ageMs <= 6 * 60 * 60_000) return 'acceptable'; // ≤ 6 h
  return 'stale';
}

let counter = 0;
export function signalId(provider: string, category: string): string {
  counter += 1;
  return `${category}:${provider}:${Date.now().toString(36)}:${counter.toString(36)}`;
}

export interface BuildSignalInput<T> {
  provider: string;
  category: string;
  value: T;
  unit?: string;
  /** Horodatage de l'évènement (def. = receivedAt). */
  timestamp?: string;
  receivedAt?: string;
  location?: SignalLocation;
  freshness?: Freshness;
  confidence: number;
  sourceType: SourceType;
  warnings?: string[];
  rawPayloadRef?: string;
}

export function buildSignal<T>(input: BuildSignalInput<T>): ContextSignal<T> {
  const receivedAt = input.receivedAt ?? nowIso();
  const timestamp = input.timestamp ?? receivedAt;
  const freshness =
    input.freshness ?? freshnessFromAgeMs(Date.parse(receivedAt) - Date.parse(timestamp));
  return {
    id: signalId(input.provider, input.category),
    category: input.category,
    provider: input.provider,
    value: input.value,
    unit: input.unit,
    timestamp,
    receivedAt,
    location: input.location,
    freshness,
    confidence: clamp01(input.confidence),
    sourceType: input.sourceType,
    rawPayloadRef: input.rawPayloadRef,
    warnings: input.warnings,
  };
}
