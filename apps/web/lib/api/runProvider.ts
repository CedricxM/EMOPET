/**
 * Appel provider résilient : santé → cache → retry/backoff → enregistrement.
 *
 * Orchestre un appel d'adaptateur sans jamais propager une panne en conclusion :
 *  - provider en cooldown (trop d'échecs) → ignoré (le repli prendra le relais) ;
 *  - cache TTL par catégorie (sensibles = jamais cachées) ;
 *  - retry exponentiel sur erreurs réessayables ;
 *  - succès/échec consignés dans le suivi de santé ;
 *  - échec final → `null` (l'arbitrage gère l'absence, jamais une valeur forcée).
 */

import { apiCache, type CacheCategory } from './cache';
import { providerHealth } from './providerHealth';
import { withRetry } from './rateLimit';
import type { ContextSignal } from './types';

export interface ResilientFetchParams<T> {
  provider: string;
  cacheKey: string;
  cacheCategory: CacheCategory;
  fetcher: (signal?: AbortSignal) => Promise<ContextSignal<T>>;
  signal?: AbortSignal;
  /** Nouvelles tentatives (def. 1). */
  retries?: number;
}

export async function resilientFetch<T>(params: ResilientFetchParams<T>): Promise<ContextSignal<T> | null> {
  const { provider, cacheKey, cacheCategory, fetcher, signal, retries = 1 } = params;

  if (providerHealth.isTemporarilyDisabled(provider)) return null;

  const cached = apiCache.get<ContextSignal<T>>(cacheKey);
  if (cached) return cached;

  try {
    const result = await withRetry(() => fetcher(signal), { retries });
    apiCache.set(cacheKey, result, cacheCategory);
    providerHealth.recordSuccess({ provider, ok: true, status: 'active', checkedAt: new Date().toISOString() });
    return result;
  } catch (e) {
    providerHealth.recordFailure({ provider, ok: false, status: 'active', checkedAt: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}
