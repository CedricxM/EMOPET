/**
 * Adaptateur dog.ceo (images/races). Catégorie `dog_knowledge`, statut `active`.
 * Open data, sans clé. Usage ONBOARDING / UI uniquement : images et liste de races.
 * N'infère JAMAIS un état de l'animal (politique non médicale). Repli : `the-dog-api`.
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'dog-ceo';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Slug dog.ceo : minuscule, premier mot (ex. « Labrador Retriever » → « labrador »). */
export function breedSlug(breed: string): string {
  return breed.trim().toLowerCase().split(/\s+/)[0] ?? '';
}

export interface BreedImagesValue {
  breed: string;
  images: string[];
}
interface ImagesResp {
  status?: string;
  message?: string[] | string;
}

export function normalizeImages(breed: string, raw: ImagesResp): ContextSignal<BreedImagesValue> {
  const msg = raw.message;
  const images = Array.isArray(msg) ? msg : typeof msg === 'string' ? [msg] : [];
  if (raw.status !== 'success' && images.length === 0) {
    throw new ProviderInvalidResponseError(PROVIDER, 'Réponse dog.ceo invalide.');
  }
  return buildSignal<BreedImagesValue>({ provider: PROVIDER, category: 'dog_knowledge', value: { breed, images }, sourceType: 'measured', confidence: 0.7 });
}

export async function getBreedImages(breed: string, count = 3, opts: FetchOpts = {}): Promise<ContextSignal<BreedImagesValue>> {
  const url = `${BASE}/breed/${encodeURIComponent(breedSlug(breed))}/images/random/${count}`;
  const res = await fetchWithTimeout(url, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return normalizeImages(breed, (await res.json()) as ImagesResp);
}

export interface BreedListValue {
  query: string;
  breeds: string[];
}
interface BreedListResp {
  status?: string;
  message?: Record<string, string[]>;
}

/** Pur : aplati la liste dog.ceo et filtre par requête. */
export function normalizeBreedList(query: string, raw: BreedListResp): ContextSignal<BreedListValue> {
  const map = raw.message ?? {};
  const all: string[] = [];
  for (const [breed, subs] of Object.entries(map)) {
    all.push(breed);
    for (const sub of subs) all.push(`${sub} ${breed}`);
  }
  const q = query.trim().toLowerCase();
  const breeds = q ? all.filter((b) => b.includes(q)) : all;
  return buildSignal<BreedListValue>({ provider: PROVIDER, category: 'dog_knowledge', value: { query, breeds }, sourceType: 'measured', confidence: 0.7 });
}

export async function searchDogBreeds(query: string, opts: FetchOpts = {}): Promise<ContextSignal<BreedListValue>> {
  const res = await fetchWithTimeout(`${BASE}/breeds/list/all`, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return normalizeBreedList(query, (await res.json()) as BreedListResp);
}

export interface BreedInfoValue {
  breed: string;
  known: boolean;
}
export async function getBreedInfo(breed: string, opts: FetchOpts = {}): Promise<ContextSignal<BreedInfoValue>> {
  const slug = breedSlug(breed);
  const sig = await searchDogBreeds(slug, opts);
  return buildSignal<BreedInfoValue>({ provider: PROVIDER, category: 'dog_knowledge', value: { breed, known: sig.value.breeds.some((b) => b.includes(slug)) }, sourceType: 'measured', confidence: 0.6 });
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/breeds/list/all`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [normalizeImages('labrador', { status: 'success', message: ['https://images.dog.ceo/breeds/labrador/n02099712_1.jpg'] })];
}
