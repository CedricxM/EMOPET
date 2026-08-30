import type { BreizSourceUsagePolicy } from './sourceRegistry';

export interface BreizSourceProvenance {
  sourceId: string;
  sourceName: string;
  canonicalUrl: string;
  publisher: string;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  territory: string;
  contentType: string;
  license: string | null;
  allowedUse: BreizSourceUsagePolicy[];
  attribution: string | null;
  language: string;
  checksumSha256: string | null;
  freshnessPolicyHours: number | null;
  authority: 'official' | 'institutional' | 'partner' | 'community';
}

export interface BreizContextCard<T = unknown> {
  id: string;
  title: string;
  summary: string;
  territory: string;
  relevanceReason: string;
  data: T;
  provenance: BreizSourceProvenance[];
}

export function isFresh(provenance: BreizSourceProvenance, now = Date.now()): boolean {
  if (provenance.freshnessPolicyHours === null) return true;
  const retrieved = Date.parse(provenance.retrievedAt);
  if (!Number.isFinite(retrieved)) return false;
  return now - retrieved <= provenance.freshnessPolicyHours * 60 * 60 * 1000;
}
