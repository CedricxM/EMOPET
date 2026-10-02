const MIN_ACCESS_TOKEN_LENGTH = 16;
const MAX_ACCESS_TOKEN_LENGTH = 8_192;
const MIN_REFRESH_TOKEN_LENGTH = 32;
const MAX_REFRESH_TOKEN_LENGTH = 512;
const MAX_ACCESS_TTL_SECONDS = 86_400;
const MAX_REFRESH_HORIZON_MS = 180 * 24 * 60 * 60 * 1000;

export const OWNER_ACCESS_COOKIE = 'emopet_owner_access';
export const OWNER_REFRESH_COOKIE = 'emopet_owner_refresh';

export interface OwnerSessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt: Date;
}

export type OwnerSessionBackendResult =
  | { status: 'AUTHENTICATED'; tokens: OwnerSessionTokens }
  | {
      status: 'DENIED';
      reason: 'invalid_credentials' | 'email_verification_required' | 'invalid_session';
    }
  | { status: 'UNAVAILABLE' };

export interface OwnerSessionBackendOptions {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedBearer(
  value: unknown,
  min: number,
  max: number,
): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (
    token.length < min
    || token.length > max
    || /[\s\r\n]/.test(token)
  ) {
    return null;
  }
  return token;
}

export function resolveOwnerBackendOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env['EMOPET_INTERNAL_BACKEND_URL']?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (
    url.username
    || url.password
    || url.search
    || url.hash
    || (url.pathname !== '/' && url.pathname !== '')
  ) {
    return null;
  }

  if (env.NODE_ENV === 'production') {
    if (url.protocol !== 'https:') return null;
  } else if (
    url.protocol !== 'https:'
    && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
  ) {
    return null;
  }

  return url.origin;
}

export function parseOwnerSessionTokens(
  value: unknown,
  now: Date = new Date(),
): OwnerSessionTokens | null {
  if (!isRecord(value)) return null;
  if (value.tokenType !== 'Bearer') return null;

  const accessToken = boundedBearer(
    value.accessToken,
    MIN_ACCESS_TOKEN_LENGTH,
    MAX_ACCESS_TOKEN_LENGTH,
  );
  const refreshToken = boundedBearer(
    value.refreshToken,
    MIN_REFRESH_TOKEN_LENGTH,
    MAX_REFRESH_TOKEN_LENGTH,
  );
  if (!accessToken || !refreshToken || !refreshToken.startsWith('emopet_rt_')) {
    return null;
  }

  if (
    !Number.isSafeInteger(value.accessTokenExpiresInSeconds)
    || Number(value.accessTokenExpiresInSeconds) <= 0
    || Number(value.accessTokenExpiresInSeconds) > MAX_ACCESS_TTL_SECONDS
  ) {
    return null;
  }

  if (typeof value.refreshTokenExpiresAt !== 'string') return null;
  const refreshTokenExpiresAt = new Date(value.refreshTokenExpiresAt);
  const refreshAt = refreshTokenExpiresAt.getTime();
  const nowMs = now.getTime();
  if (
    !Number.isFinite(refreshAt)
    || refreshAt <= nowMs
    || refreshAt - nowMs > MAX_REFRESH_HORIZON_MS
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresInSeconds: Number(value.accessTokenExpiresInSeconds),
    refreshTokenExpiresAt,
  };
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function postBackend(
  path: string,
  body: unknown,
  options: OwnerSessionBackendOptions,
): Promise<Response | null> {
  const origin = resolveOwnerBackendOrigin(options.env ?? process.env);
  if (!origin) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    return await fetchImpl(new URL(path, origin), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    return null;
  }
}

export async function loginOwnerSession(
  input: { email: string; password: string },
  options: OwnerSessionBackendOptions = {},
): Promise<OwnerSessionBackendResult> {
  const response = await postBackend('/api/auth/login', input, options);
  if (!response) return { status: 'UNAVAILABLE' };

  if (response.status === 401) {
    return { status: 'DENIED', reason: 'invalid_credentials' };
  }
  if (response.status === 403) {
    return { status: 'DENIED', reason: 'email_verification_required' };
  }
  if (!response.ok) return { status: 'UNAVAILABLE' };

  const tokens = parseOwnerSessionTokens(
    await safeJson(response),
    (options.now ?? (() => new Date()))(),
  );
  return tokens
    ? { status: 'AUTHENTICATED', tokens }
    : { status: 'UNAVAILABLE' };
}

export async function refreshOwnerSession(
  refreshTokenValue: unknown,
  options: OwnerSessionBackendOptions = {},
): Promise<OwnerSessionBackendResult> {
  const refreshToken = boundedBearer(
    refreshTokenValue,
    MIN_REFRESH_TOKEN_LENGTH,
    MAX_REFRESH_TOKEN_LENGTH,
  );
  if (!refreshToken || !refreshToken.startsWith('emopet_rt_')) {
    return { status: 'DENIED', reason: 'invalid_session' };
  }

  const response = await postBackend(
    '/api/auth/refresh',
    { refreshToken },
    options,
  );
  if (!response) return { status: 'UNAVAILABLE' };
  if (response.status === 400 || response.status === 401) {
    return { status: 'DENIED', reason: 'invalid_session' };
  }
  if (!response.ok) return { status: 'UNAVAILABLE' };

  const tokens = parseOwnerSessionTokens(
    await safeJson(response),
    (options.now ?? (() => new Date()))(),
  );
  return tokens
    ? { status: 'AUTHENTICATED', tokens }
    : { status: 'UNAVAILABLE' };
}

export async function logoutOwnerSession(
  refreshTokenValue: unknown,
  options: OwnerSessionBackendOptions = {},
): Promise<'LOGGED_OUT' | 'INVALID_SESSION' | 'UNAVAILABLE'> {
  const refreshToken = boundedBearer(
    refreshTokenValue,
    MIN_REFRESH_TOKEN_LENGTH,
    MAX_REFRESH_TOKEN_LENGTH,
  );
  if (!refreshToken || !refreshToken.startsWith('emopet_rt_')) {
    return 'INVALID_SESSION';
  }

  const response = await postBackend(
    '/api/auth/logout',
    { refreshToken },
    options,
  );
  if (!response) return 'UNAVAILABLE';
  if (response.status === 204) return 'LOGGED_OUT';
  if (response.status === 400 || response.status === 401) return 'INVALID_SESSION';
  return 'UNAVAILABLE';
}

export function ownerSessionCookiePolicy(
  env: NodeJS.ProcessEnv = process.env,
): {
  httpOnly: true;
  sameSite: 'strict';
  secure: boolean;
  path: '/';
} {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
  };
}
