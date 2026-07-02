/**
 * Adaptateur Disify (validation email / jetable). `email_validation`, statut `active`.
 * Sans clé. Qualité de compte / anti-fake à l'onboarding. Repli : `eva`.
 * Confidentialité : un email est une donnée personnelle — usage minimal, jamais caché
 * de façon sensible au-delà du nécessaire.
 */

import { fetchWithTimeout } from '../fetchWithTimeout';
import { ProviderInvalidResponseError } from '../errors';
import { mustGetProvider } from '../providerRegistry';
import type { ContextSignal, ProviderDescriptor, ProviderHealthResult } from '../types';
import { buildSignal, nowIso } from './_shared';

const PROVIDER = 'disify';
export const descriptor: ProviderDescriptor = mustGetProvider(PROVIDER);
const BASE = descriptor.baseUrl;
const EVA_BASE = mustGetProvider('eva').baseUrl;

interface FetchOpts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type EmailRisk = 'low' | 'medium' | 'high';
export interface EmailValidationValue {
  email: string;
  format: boolean;
  disposable: boolean;
  dns: boolean;
  risk: EmailRisk;
}

/** Pur : niveau de risque depuis les drapeaux Disify. */
export function riskFrom(flags: { format?: boolean; disposable?: boolean; dns?: boolean }): EmailRisk {
  if (flags.disposable) return 'high';
  if (flags.format === false || flags.dns === false) return 'high';
  return 'low';
}

interface DisifyResp {
  format?: boolean;
  disposable?: boolean;
  dns?: boolean;
}

export function normalizeDisify(email: string, raw: DisifyResp): ContextSignal<EmailValidationValue> {
  const value: EmailValidationValue = {
    email,
    format: raw.format ?? false,
    disposable: raw.disposable ?? false,
    dns: raw.dns ?? false,
    risk: riskFrom(raw),
  };
  return buildSignal<EmailValidationValue>({ provider: PROVIDER, category: 'email_validation', value, sourceType: 'measured', confidence: 0.8 });
}

export async function validateEmail(email: string, opts: FetchOpts = {}): Promise<ContextSignal<EmailValidationValue>> {
  const res = await fetchWithTimeout(`${BASE}/email/${encodeURIComponent(email)}`, { provider: PROVIDER, signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError(PROVIDER, `HTTP ${res.status}`);
  return normalizeDisify(email, (await res.json()) as DisifyResp);
}

export async function detectDisposableEmail(email: string, opts: FetchOpts = {}): Promise<boolean> {
  return (await validateEmail(email, opts)).value.disposable;
}

/** Alias sémantique. */
export const getEmailRisk = validateEmail;

interface EvaResp {
  status?: string;
  data?: { valid_syntax?: boolean; disposable?: boolean; mx_found?: boolean };
}

/** Repli EVA — même forme normalisée. */
export async function validateEmailEva(email: string, opts: FetchOpts = {}): Promise<ContextSignal<EmailValidationValue>> {
  const res = await fetchWithTimeout(`${EVA_BASE}/email?email=${encodeURIComponent(email)}`, { provider: 'eva', signal: opts.signal ?? null, timeoutMs: opts.timeoutMs ?? 8000 });
  if (!res.ok) throw new ProviderInvalidResponseError('eva', `HTTP ${res.status}`);
  const json = (await res.json()) as EvaResp;
  const d = json.data ?? {};
  const value: EmailValidationValue = {
    email,
    format: d.valid_syntax ?? false,
    disposable: d.disposable ?? false,
    dns: d.mx_found ?? false,
    risk: riskFrom({ format: d.valid_syntax, disposable: d.disposable, dns: d.mx_found }),
  };
  return buildSignal<EmailValidationValue>({ provider: 'eva', category: 'email_validation', value, sourceType: 'measured', confidence: 0.75 });
}

export async function healthCheck(signal?: AbortSignal): Promise<ProviderHealthResult> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${BASE}/email/test@gmail.com`, { provider: PROVIDER, signal: signal ?? null, timeoutMs: 6000 });
    return { provider: PROVIDER, ok: res.ok, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso() };
  } catch (e) {
    return { provider: PROVIDER, ok: false, status: descriptor.status, latencyMs: Date.now() - start, checkedAt: nowIso(), error: e instanceof Error ? e.message : String(e) };
  }
}

export function mockResponse(): ContextSignal[] {
  return [normalizeDisify('camille@example.com', { format: true, disposable: false, dns: true })];
}
