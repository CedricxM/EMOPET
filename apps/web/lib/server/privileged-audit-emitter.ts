import {
  signInternalAuditServiceToken,
  type InternalAuditServiceKeyConfig,
  type PrivilegedAction,
} from '@emopet/privileged-auth';

import type { PrivilegedRequestDecision } from './privileged-request';

const INTERNAL_AUDIT_PATH = '/internal/security-audit';
const MAX_DELIVERY_ATTEMPTS = 2;

export type PrivilegedAuditTarget = {
  scope: 'account' | 'dog' | 'support_case' | 'security_incident' | 'system';
  ref: string | null;
};

export type PrivilegedAuditEmissionResult =
  | { status: 'EMITTED'; duplicate: boolean }
  | { status: 'NOT_EMITTED'; reason: 'authority_unavailable' }
  | {
      status: 'FAILED';
      reason: 'configuration_unavailable' | 'delivery_failed';
    };

export interface PrivilegedAuditEmitterOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  eventIdFactory?: () => string;
  env?: NodeJS.ProcessEnv;
}

function mapDecisionForCanonicalAudit(
  decision: PrivilegedRequestDecision,
  action: PrivilegedAction,
): unknown | null {
  if (decision.status === 'UNAVAILABLE') return null;

  if (decision.status === 'AUTHORIZED') {
    return {
      status: 'AUTHORIZED',
      subject: decision.subject,
      role: decision.role,
      action,
    };
  }

  if ('subject' in decision) {
    return {
      status: 'DENIED',
      reason: 'action_not_allowed',
      subject: decision.subject,
      role: decision.role,
      action,
    };
  }

  // The canonical audit contract intentionally has one bounded anonymous
  // denial class. Missing/invalid browser credentials therefore become
  // anonymous invalid-principal evidence without leaking token/cookie detail.
  return {
    status: 'DENIED',
    reason: 'invalid_token',
  };
}

function resolveBackendOrigin(
  env: NodeJS.ProcessEnv,
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

function keyFromEnvironment(env: NodeJS.ProcessEnv): InternalAuditServiceKeyConfig | null {
  const secret = env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET']?.trim();
  if (!secret) return null;

  return {
    secret,
    ordinaryJwtSecret: env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: env['PRIVILEGED_JWT_SECRET'] ?? null,
  };
}

async function responseDuplicate(response: Response): Promise<boolean> {
  try {
    const body = await response.json() as unknown;
    return Boolean(
      body
      && typeof body === 'object'
      && !Array.isArray(body)
      && (body as { duplicate?: unknown }).duplicate === true
    );
  } catch {
    return false;
  }
}

export async function emitPrivilegedAuditDecision(input: {
  decision: PrivilegedRequestDecision;
  action: PrivilegedAction;
  target: PrivilegedAuditTarget;
  occurredAt: string;
}, options: PrivilegedAuditEmitterOptions = {}): Promise<PrivilegedAuditEmissionResult> {
  const canonicalDecision = mapDecisionForCanonicalAudit(input.decision, input.action);
  if (!canonicalDecision) {
    return { status: 'NOT_EMITTED', reason: 'authority_unavailable' };
  }

  const env = options.env ?? process.env;
  const backendOrigin = resolveBackendOrigin(env);
  const key = keyFromEnvironment(env);
  if (!backendOrigin || !key) {
    return { status: 'FAILED', reason: 'configuration_unavailable' };
  }

  const eventId = (options.eventIdFactory ?? (() => globalThis.crypto.randomUUID()))();
  const body = JSON.stringify({
    decision: canonicalDecision,
    action: input.action,
    target: input.target,
    occurredAt: input.occurredAt,
  });

  let token: string;
  try {
    token = await signInternalAuditServiceToken({
      eventId,
      body,
      key,
      now: (options.now ?? (() => new Date()))(),
    });
  } catch {
    return { status: 'FAILED', reason: 'configuration_unavailable' };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(INTERNAL_AUDIT_PATH, backendOrigin).toString();

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
        return {
          status: 'EMITTED',
          duplicate: await responseDuplicate(response),
        };
      }

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
