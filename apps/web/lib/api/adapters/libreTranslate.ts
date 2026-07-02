/**
 * Adaptateur LibreTranslate (traduction / détection de langue). `translation`, `active`.
 * Auto-hébergeable (`API_LIBRETRANSLATE_URL`). Sert l'onboarding multilingue et la
 * traduction des notes utilisateur — JAMAIS d'inférence d'état de l'animal.
 * Repli : `detectlanguage`.
 */

import { readEnv } from '../config';
import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, clamp01, nowIso } from './_shared';

const PROVIDER = 'libretranslate';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function endpoint(): string {
  return readEnv('API_LIBRETRANSLATE_URL') ?? descriptor.baseUrl;
}

async function postJson(path: string, body: Record<string, unknown>, opts: FetchOpts): Promise<unknown> {
  const apiKey = readEnv('API_LIBRETRANSLATE_KEY');
  const res = await fetchWithTimeout(`${endpoint()}${path}`, {
    provider: PROVIDER,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(apiKey ? { ...body, api_key: apiKey } : body),
    signal: opts.signal ?? null,
    timeoutMs: opts.timeoutMs ?? 8000,
  });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return res.json();
}

export interface DetectValue {
  language: string;
  confidence: number;
}
interface DetectRow {
  language?: string;
  confidence?: number;
}

/** Pur : prend la meilleure détection. `confidence` LibreTranslate est en 0..100. */
export function normalizeDetect(raw: DetectRow[]): ContextSignal<DetectValue> {
  const top = raw[0];
  if (!top?.language) throw new ProviderInvalidResponseError(PROVIDER, 'Détection vide.');
  const conf = clamp01((top.confidence ?? 50) / 100);
  return buildSignal<DetectValue>({ provider: PROVIDER, category: 'translation', value: { language: top.language, confidence: conf }, sourceType: 'modeled', confidence: conf });
}

export async function detectLanguage(text: string, opts: FetchOpts = {}): Promise<ContextSignal<DetectValue>> {
  const raw = (await postJson('/detect', { q: text }, opts)) as DetectRow[];
  return normalizeDetect(Array.isArray(raw) ? raw : []);
}

export interface TranslateValue {
  translatedText: string;
  source: string;
  target: string;
}
interface TranslateResp {
  translatedText?: string;
}

export async function translateText(text: string, source: string, target: string, opts: FetchOpts = {}): Promise<ContextSignal<TranslateValue>> {
  const raw = (await postJson('/translate', { q: text, source, target, format: 'text' }, opts)) as TranslateResp;
  if (typeof raw.translatedText !== 'string') throw new ProviderInvalidResponseError(PROVIDER, 'Traduction absente.');
  return buildSignal<TranslateValue>({ provider: PROVIDER, category: 'translation', value: { translatedText: raw.translatedText, source, target }, sourceType: 'modeled', confidence: 0.7 });
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    await postJson('/detect', { q: 'hello' }, { signal: signal ?? undefined, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: true, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [normalizeDetect([{ language: 'fr', confidence: 92 }])];
}
