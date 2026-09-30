import { Hono } from 'hono';
import {
  verifyInternalAuditServiceToken,
  type InternalAuditServiceKeyConfig,
} from '@emopet/privileged-auth';

import { composePrivilegedAuditEvent } from '../security/security-audit-composition.js';
import {
  persistSecurityAuditEventIdempotent,
  type IdempotentSecurityAuditPersistenceResult,
} from '../security/security-audit-repository.js';

const MAX_INTERNAL_AUDIT_BODY_BYTES = 4 * 1024;
const BODY_KEYS = Object.freeze(['decision', 'action', 'target', 'occurredAt']);

type PersistAudit = (
  event: unknown,
  eventId: string,
) => Promise<IdempotentSecurityAuditPersistenceResult>;

export interface InternalSecurityAuditRouteOptions {
  persist?: PersistAudit;
  now?: () => Date;
  keyProvider?: () => InternalAuditServiceKeyConfig;
}

function hasExactBodyKeys(value: unknown): value is {
  decision: unknown;
  action: unknown;
  target: unknown;
  occurredAt: unknown;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === BODY_KEYS.length
    && keys.every((key) => BODY_KEYS.includes(key))
  );
}

function readBearer(value: string | undefined): string | null {
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  if (token.length < 16 || token.length > 8_192 || /\s/.test(token)) return null;
  return token;
}

function keyFromEnvironment(): InternalAuditServiceKeyConfig {
  return {
    secret: process.env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET'] ?? '',
    ordinaryJwtSecret: process.env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: process.env['PRIVILEGED_JWT_SECRET'] ?? null,
  };
}

export function createInternalSecurityAuditRoute(
  options: InternalSecurityAuditRouteOptions = {},
) {
  const route = new Hono();
  const persist = options.persist ?? persistSecurityAuditEventIdempotent;
  const now = options.now ?? (() => new Date());
  const keyProvider = options.keyProvider ?? keyFromEnvironment;

  route.post('/', async (c) => {
    c.header('Cache-Control', 'no-store');

    const contentLength = Number(c.req.header('content-length') ?? '0');
    if (
      !Number.isFinite(contentLength)
      || contentLength < 0
      || contentLength > MAX_INTERNAL_AUDIT_BODY_BYTES
    ) {
      return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
    }

    const bodyText = await c.req.text();
    if (
      new TextEncoder().encode(bodyText).byteLength > MAX_INTERNAL_AUDIT_BODY_BYTES
      || bodyText.length === 0
    ) {
      return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
    }

    const token = readBearer(c.req.header('authorization'));
    if (!token) {
      return c.json({ ok: false, error: 'internal_audit_auth_failed' }, 401);
    }

    let serviceToken: Awaited<ReturnType<typeof verifyInternalAuditServiceToken>>;
    try {
      serviceToken = await verifyInternalAuditServiceToken({
        token,
        body: bodyText,
        key: keyProvider(),
        now: now(),
      });
    } catch {
      return c.json({ ok: false, error: 'internal_audit_auth_failed' }, 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
    }

    if (!hasExactBodyKeys(payload)) {
      return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
    }

    const composed = composePrivilegedAuditEvent(
      payload.decision,
      payload.action,
      payload.target,
      payload.occurredAt,
    );
    if (composed.status !== 'COMPOSED') {
      return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
    }

    const persisted = await persist(composed.event, serviceToken.eventId);
    if (!persisted.ok) {
      if (persisted.error === 'IDEMPOTENCY_CONFLICT') {
        return c.json({ ok: false, error: 'audit_idempotency_conflict' }, 409);
      }
      if (
        persisted.error === 'INVALID_AUDIT_EVENT'
        || persisted.error === 'INVALID_EVENT_ID'
      ) {
        return c.json({ ok: false, error: 'invalid_audit_payload' }, 400);
      }
      return c.json({ ok: false, error: 'audit_persistence_unavailable' }, 503);
    }

    return c.json(
      {
        ok: true,
        stored: true,
        duplicate: persisted.duplicate,
      },
      persisted.duplicate ? 200 : 201,
    );
  });

  return route;
}

export const internalSecurityAudit = createInternalSecurityAuditRoute();
