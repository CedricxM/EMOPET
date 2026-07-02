/**
 * Gestion des limites de débit & nouvelles tentatives.
 *
 * Réutilise le limiteur fenêtre fixe existant (`lib/server/rate-limit`) — pas de
 * duplication — et ajoute un backoff exponentiel avec jitter pour les retries.
 */

import { createFixedWindowRateLimiter } from '../server/rate-limit';
import { ProviderError } from './errors';

export { createFixedWindowRateLimiter };
export type { RateLimitResult, FixedWindowRateLimitOptions } from '../server/rate-limit';

/** Backoff exponentiel « full jitter » : délai aléatoire dans [0, min(cap, base·2^n)]. */
export function backoffDelayMs(attempt: number, baseMs = 300, capMs = 8000): number {
  const exp = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(Math.random() * exp);
}

export interface RetryOptions {
  /** Nombre de nouvelles tentatives après le 1er essai (def. 2). */
  retries?: number;
  baseMs?: number;
  capMs?: number;
  /** Fonction de pause injectable (tests déterministes). */
  sleep?: (ms: number) => Promise<void>;
  /** Une erreur est-elle réessayable ? (def. `ProviderError.retryable`). */
  isRetryable?: (err: unknown) => boolean;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exécute `fn` avec backoff. Ne réessaie que les erreurs réessayables
 * (timeout, indisponibilité, rate-limit). Relaie la dernière erreur sinon.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { retries = 2, baseMs = 300, capMs = 8000, sleep = defaultSleep } = opts;
  const isRetryable = opts.isRetryable ?? ((e: unknown) => e instanceof ProviderError && e.retryable);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isRetryable(err)) break;
      await sleep(backoffDelayMs(attempt, baseMs, capMs));
    }
  }
  throw lastErr;
}
