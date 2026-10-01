import {
  signInternalAlertAckServiceToken,
  type InternalAlertAckServiceKeyConfig,
} from '@emopet/privileged-auth';

import type { PrivilegedRequestDecision } from './privileged-request';

const INTERNAL_ALERT_ACK_PATH = '/internal/security-alert-ack';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SecurityAlertAckEmissionResult =
  | { status: 'ACKNOWLEDGED'; duplicate: boolean }
  | {
      status:
        | 'INVALID_AUTHORITY'
        | 'INVALID_ALERT'
        | 'NOT_FOUND'
        | 'CONFLICT'
        | 'CONFIGURATION_UNAVAILABLE'
        | 'DELIVERY_FAILED';
    };

export interface SecurityAlertAckEmitterOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  requestIdFactory?: () => string;
  env?: NodeJS.ProcessEnv;
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

function backendOrigin(env: NodeJS.ProcessEnv): string | null {
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

function keyFromEnvironment(env: NodeJS.ProcessEnv): InternalAlertAckServiceKeyConfig | null {
  const secret = env['EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET']?.trim();
  if (!secret) return null;

  return {
    secret,
    ordinaryJwtSecret: env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: env['PRIVILEGED_JWT_SECRET'] ?? null,
    internalAuditServiceSecret: env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET'] ?? null,
  };
}

function authorizedIncidentCoordinator(
  decision: PrivilegedRequestDecision,
): decision is Extract<PrivilegedRequestDecision, { status: 'AUTHORIZED' }> {
  return decision.status === 'AUTHORIZED'
    && decision.action === 'security.incident.coordinate'
    && (decision.role === 'admin' || decision.role === 'operator');
}

export async function emitSecurityAlertAcknowledgement(input: {
  authorization: PrivilegedRequestDecision;
  alertId: string;
  acknowledgedAt: string;
}, options: SecurityAlertAckEmitterOptions = {}): Promise<SecurityAlertAckEmissionResult> {
  if (!authorizedIncidentCoordinator(input.authorization)) {
    return { status: 'INVALID_AUTHORITY' };
  }
  if (!UUID_RE.test(input.alertId)) {
    return { status: 'INVALID_ALERT' };
  }

  const acknowledgedAt = canonicalUtcTimestamp(input.acknowledgedAt);
  if (!acknowledgedAt) return { status: 'INVALID_ALERT' };

  const env = options.env ?? process.env;
  const origin = backendOrigin(env);
  const key = keyFromEnvironment(env);
  if (!origin || !key) {
    return { status: 'CONFIGURATION_UNAVAILABLE' };
  }

  const requestId =
    (options.requestIdFactory ?? (() => globalThis.crypto.randomUUID()))();
  if (!UUID_RE.test(requestId)) return { status: 'CONFIGURATION_UNAVAILABLE' };

  const body = JSON.stringify({
    alertId: input.alertId.toLowerCase(),
    acknowledgedAt,
    subject: input.authorization.subject.toLowerCase(),
    role: input.authorization.role,
  });

  let token: string;
  try {
    token = await signInternalAlertAckServiceToken({
      requestId,
      body,
      key,
      now: (options.now ?? (() => new Date()))(),
    });
  } catch {
    return { status: 'CONFIGURATION_UNAVAILABLE' };
  }

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(
      new URL(INTERNAL_ALERT_ACK_PATH, origin).toString(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        cache: 'no-store',
      },
    );
  } catch {
    return { status: 'DELIVERY_FAILED' };
  }

  if (response.ok) {
    try {
      const payload = await response.json() as unknown;
      const duplicate = Boolean(
        payload
        && typeof payload === 'object'
        && !Array.isArray(payload)
        && (payload as { duplicate?: unknown }).duplicate === true
      );
      return { status: 'ACKNOWLEDGED', duplicate };
    } catch {
      return { status: 'DELIVERY_FAILED' };
    }
  }

  if (response.status === 404) return { status: 'NOT_FOUND' };
  if (response.status === 409) return { status: 'CONFLICT' };
  if (response.status === 400) return { status: 'INVALID_ALERT' };
  return { status: 'DELIVERY_FAILED' };
}
