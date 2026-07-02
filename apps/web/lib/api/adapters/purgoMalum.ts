/**
 * Adaptateur PurgoMalum (filtre de profanité / modération texte). `moderation`, `active`.
 * Sans clé. Anglais surtout (pour le FR, voir `tisane` en scaffold). La catégorie
 * `moderation` n'est JAMAIS mise en cache (cf. cache.ts).
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'purgomalum';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ModerationValue {
  original: string;
  sanitized: string;
  clean: boolean;
}
interface PurgoResp {
  result?: string;
}

/** Pur : `clean` si le texte nettoyé est identique à l'original. */
export function normalizeModeration(original: string, raw: PurgoResp): ContextSignal<ModerationValue> {
  const sanitized = typeof raw.result === 'string' ? raw.result : original;
  return buildSignal<ModerationValue>({ provider: PROVIDER, category: 'moderation', value: { original, sanitized, clean: sanitized === original }, sourceType: 'measured', confidence: 0.7 });
}

export async function moderateText(text: string, opts: FetchOpts = {}): Promise<ContextSignal<ModerationValue>> {
  const res = await fetchWithTimeout(`${BASE}/json?text=${encodeURIComponent(text)}`, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return normalizeModeration(text, (await res.json()) as PurgoResp);
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/json?text=test`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [normalizeModeration('balade au parc ce matin', { result: 'balade au parc ce matin' })];
}
