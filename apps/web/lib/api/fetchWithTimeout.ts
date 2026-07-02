/**
 * `fetch` avec timeout dur (AbortController) + propagation d'un signal externe.
 * Seul point autorisé pour les appels réseau bas niveau de la couche API :
 * aucun adaptateur ne doit appeler `fetch` directement ailleurs.
 */

import { ProviderTimeoutError } from './errors';

export interface FetchWithTimeoutOptions extends Omit<RequestInit, 'signal'> {
  /** Délai max avant abandon (ms). Défaut 8 s. */
  timeoutMs?: number;
  /** Nom du provider (pour l'erreur typée). */
  provider?: string;
  /** Signal externe (annulation parente) combiné au timeout interne. */
  signal?: AbortSignal | null;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 8000, provider = 'unknown', signal: external, ...init } = options;
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();

  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw new ProviderTimeoutError(provider, `Délai dépassé après ${timeoutMs} ms.`);
    throw err; // abandon externe ou erreur réseau → relayé tel quel
  } finally {
    clearTimeout(timer);
    if (external) external.removeEventListener('abort', onExternalAbort);
  }
}
