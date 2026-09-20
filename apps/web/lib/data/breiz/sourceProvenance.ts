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

/**
 * Trois états, parce que « pas de règle » n'est pas « à jour ».
 *
 * `no_recheck_rule` dit qu'aucune fraîcheur ne peut être affirmée, ce qui est
 * une observation différente de `stale` : l'une constate une preuve périmée,
 * l'autre constate l'absence de la règle qui permettrait d'en juger.
 */
export type BreizFreshnessVerdict = 'fresh' | 'stale' | 'no_recheck_rule' | 'unreadable_retrieval_date';

export function evaluateFreshness(
  provenance: BreizSourceProvenance,
  now = Date.now(),
): BreizFreshnessVerdict {
  if (provenance.freshnessPolicyHours === null) return 'no_recheck_rule';
  const retrieved = Date.parse(provenance.retrievedAt);
  if (!Number.isFinite(retrieved)) return 'unreadable_retrieval_date';
  return now - retrieved <= provenance.freshnessPolicyHours * 60 * 60 * 1000 ? 'fresh' : 'stale';
}

/**
 * Fail-closed : seul `fresh` vaut vrai.
 *
 * La version précédente rendait `true` quand `freshnessPolicyHours` valait
 * `null`, c'est-à-dire qu'une source sans aucune règle de re-contrôle était
 * déclarée à jour. L'absence de règle devenait une conformité. La gate
 * DATA-LIC-G6 de #116 exige au contraire une `expiry/recheck rule` comme
 * preuve : sans elle, rien ne peut être affirmé.
 */
export function isFresh(provenance: BreizSourceProvenance, now = Date.now()): boolean {
  return evaluateFreshness(provenance, now) === 'fresh';
}
