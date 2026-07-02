import { NextResponse } from 'next/server';
import type { RateLimitResult } from './rate-limit';

export interface RouteLimiter {
  check(key: string, now?: number): RateLimitResult;
}

function trustedProxyHeadersEnabled(): boolean {
  return process.env['EMOPET_TRUST_PROXY_HEADERS'] === 'true';
}

function safeKeySegment(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^a-zA-Z0-9:._-]/g, '_')
    .slice(0, 96)
    .trim() || 'local';
}

export function requestClientKey(req: Request, scope: string): string {
  if (!trustedProxyHeadersEnabled()) return `${scope}:local`;

  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip =
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    forwardedFor ||
    'local';
  return `${scope}:${safeKeySegment(ip)}`;
}

export function rateLimitHeaders(rate: RateLimitResult): HeadersInit {
  return {
    'retry-after': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
    'x-ratelimit-limit': String(rate.limit),
    'x-ratelimit-remaining': String(rate.remaining),
    'x-ratelimit-reset': String(Math.ceil(rate.resetAt / 1000)),
  };
}

export function rateLimitResponse(rate: RateLimitResult): NextResponse {
  return NextResponse.json(
    { ok: false, error: 'rate_limited' },
    { status: 429, headers: rateLimitHeaders(rate) },
  );
}

export type LimitedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 413; error: string };

export async function readLimitedJson<T>(req: Request, maxBytes: number): Promise<LimitedJsonResult<T>> {
  const rawContentLength = req.headers.get('content-length');
  if (rawContentLength) {
    const contentLength = Number(rawContentLength);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return { ok: false, status: 413, error: 'payload_too_large' };
    }
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: 'invalid_request_body' };
  }

  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    return { ok: false, status: 413, error: 'payload_too_large' };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, error: 'invalid_json' };
  }
}

export function enforceRateLimit(req: Request, limiter: RouteLimiter, scope: string): NextResponse | null {
  const rate = limiter.check(requestClientKey(req, scope));
  return rate.ok ? null : rateLimitResponse(rate);
}

export function cleanDisplayName(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 40);
  return cleaned || fallback;
}
