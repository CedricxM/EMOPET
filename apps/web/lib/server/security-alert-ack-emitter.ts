import {
  signInternalAlertAckServiceToken,
  type InternalAlertAckServiceKeyConfig,
} from '@emopet/privileged-auth';

const INTERNAL_ALERT_ACK_PATH = '/internal/security-alert-ack';
const MAX_DELIVERY_ATTEMPTS = 2;

export type SecurityAlertAckActorRole = 'admin' | 'operator';

export type SecurityAlertAckEmissionResult =
  | { status: 'ACKNOWLEDGED'; duplicate: boolean }
  | { status: 'NOT_FOUND' | 'CONFLICT' }
  | {
      status: 'FAILED';
      reason: 'configuration_unavailable' | 'delivery_failed';
    };

export interface SecurityAlertAckEmitterOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  requestIdFactory?: () => string;
  env?: NodeJS.ProcessEnv;
}

function resolveBackendOrigin(env: NodeJS.ProcessEnv): string | null {
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

function keyFromEnvironment(
  env: NodeJS.ProcessEnv,
): InternalAlertAckServiceKeyConfig | null {
  const secret = env['EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET']?.trim();
  if (!secret) return null;

  return {
    secret,
    ordinaryJwtSecret: env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: env['PRIVILEGED_JWT_SECRET'] ?? null,
    internalAuditServiceSecret:
      env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET'] ?? null,
  };
}

async function parseResponse(response: Response): Promise<{
  duplicate: boolean;
} | null> {
  try {
    const body = await response.json() as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return {
      duplicate: (body as { duplicate?: unknown }).duplicate === true,
    };
  } catch {
    return null;
  }
}

export async function emitSecurityAlertAcknowledgement(
  input: {
    alertId: string;
    actorSubject: string;
    actorRole: SecurityAlertAckActorRole;
    acknowledgedAt: string;
  },
  options: SecurityAlertAckEmitterOptions = {},
): Promise<SecurityAlertAckEmissionResult> {
  const env = options.env ?? process.env;
  const backendOrigin = resolveBackendOrigin(env);
  const key = keyFromEnvironment(env);
  if (!backendOrigin || !key) {
    return { status: 'FAILED', reason: 'configuration_unavailable' };
  }

  const requestId = (
    options.requestIdFactory ?? (() => globalThis.crypto.randomUUID())
  )();
  const body = JSON.stringify(input);

  let token: string;
  try {
    token = await signInternalAlertAckServiceToken({
      requestId,
      body,
      key,
      now: (options.now ?? (() => new Date()))(),
    });
  } catch {
    return { status: 'FAILED', reason: 'configuration_unavailable' };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(INTERNAL_ALERT_ACK_PATH, backendOrigin).toString();

  for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        cache: 'no-store',
      });

      if (response.ok) {
        const parsed = await parseResponse(response);
        return {
          status: 'ACKNOWLEDGED',
          duplicate: parsed?.duplicate === true,
        };
      }
      if (response.status === 404) return { status: 'NOT_FOUND' };
      if (response.status === 409) return { status: 'CONFLICT' };

      if (response.status < 500 || attempt === MAX_DELIVERY_ATTEMPTS - 1) {
        return { status: 'FAILED', reason: 'delivery_failed' };
      }
    } catch {
      if (attempt === MAX_DELIVERY_ATTEMPTS - 1) {
        return { status: 'FAILED', reason: 'delivery_failed' };
      }
    }
  }

  return { status: 'FAILED', reason: 'delivery_failed' };
}
