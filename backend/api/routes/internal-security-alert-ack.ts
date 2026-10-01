import { Hono } from 'hono';
import {
  verifyInternalAlertAckServiceToken,
  type InternalAlertAckServiceKeyConfig,
} from '@emopet/privileged-auth';

import {
  acknowledgeSecurityAlert,
  type SecurityAlertAcknowledgementResult,
} from '../security/security-alert-acknowledgement.js';

const MAX_INTERNAL_ALERT_ACK_BODY_BYTES = 2 * 1024;
const BODY_KEYS = Object.freeze([
  'alertId',
  'acknowledgedAt',
  'subject',
  'role',
]);

type Acknowledge = typeof acknowledgeSecurityAlert;

export interface InternalSecurityAlertAckRouteOptions {
  acknowledge?: Acknowledge;
  now?: () => Date;
  keyProvider?: () => InternalAlertAckServiceKeyConfig;
}

function exactBody(value: unknown): value is {
  alertId: unknown;
  acknowledgedAt: unknown;
  subject: unknown;
  role: unknown;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === BODY_KEYS.length
    && keys.every((key) => BODY_KEYS.includes(key));
}

function bearer(value: string | undefined): string | null {
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  if (token.length < 16 || token.length > 8_192 || /\s/.test(token)) return null;
  return token;
}

function environmentKey(): InternalAlertAckServiceKeyConfig {
  return {
    secret: process.env['EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET'] ?? '',
    ordinaryJwtSecret: process.env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: process.env['PRIVILEGED_JWT_SECRET'] ?? null,
    internalAuditServiceSecret:
      process.env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET'] ?? null,
  };
}

function responseFor(result: SecurityAlertAcknowledgementResult) {
  if (result.status === 'ACKNOWLEDGED') {
    return { status: 201 as const, body: { ok: true, duplicate: false } };
  }
  if (result.status === 'DUPLICATE') {
    return { status: 200 as const, body: { ok: true, duplicate: true } };
  }
  if (result.status === 'UNKNOWN_ALERT') {
    return { status: 404 as const, body: { ok: false, error: 'alert_not_found' } };
  }
  if (result.status === 'CONFLICT' || result.status === 'AUDIT_CONFLICT') {
    return {
      status: 409 as const,
      body: { ok: false, error: 'acknowledgement_conflict' },
    };
  }
  if (result.status === 'DATABASE_UNAVAILABLE') {
    return {
      status: 503 as const,
      body: { ok: false, error: 'acknowledgement_unavailable' },
    };
  }
  return {
    status: 400 as const,
    body: { ok: false, error: 'invalid_acknowledgement' },
  };
}

export function createInternalSecurityAlertAckRoute(
  options: InternalSecurityAlertAckRouteOptions = {},
) {
  const route = new Hono();
  const acknowledge = options.acknowledge ?? acknowledgeSecurityAlert;
  const now = options.now ?? (() => new Date());
  const keyProvider = options.keyProvider ?? environmentKey;

  route.post('/', async (c) => {
    c.header('Cache-Control', 'no-store');

    const contentLength = Number(c.req.header('content-length') ?? '0');
    if (
      !Number.isFinite(contentLength)
      || contentLength < 0
      || contentLength > MAX_INTERNAL_ALERT_ACK_BODY_BYTES
    ) {
      return c.json({ ok: false, error: 'invalid_acknowledgement' }, 400);
    }

    const bodyText = await c.req.text();
    if (
      bodyText.length === 0
      || new TextEncoder().encode(bodyText).byteLength
        > MAX_INTERNAL_ALERT_ACK_BODY_BYTES
    ) {
      return c.json({ ok: false, error: 'invalid_acknowledgement' }, 400);
    }

    const token = bearer(c.req.header('authorization'));
    if (!token) {
      return c.json({ ok: false, error: 'internal_ack_auth_failed' }, 401);
    }

    let serviceToken;
    try {
      serviceToken = await verifyInternalAlertAckServiceToken({
        token,
        body: bodyText,
        key: keyProvider(),
        now: now(),
      });
    } catch {
      return c.json({ ok: false, error: 'internal_ack_auth_failed' }, 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return c.json({ ok: false, error: 'invalid_acknowledgement' }, 400);
    }
    if (!exactBody(payload)) {
      return c.json({ ok: false, error: 'invalid_acknowledgement' }, 400);
    }

    const result = await acknowledge({
      requestId: serviceToken.requestId,
      alertId: payload.alertId,
      acknowledgedAt: payload.acknowledgedAt,
      subject: payload.subject,
      role: payload.role,
    });

    const response = responseFor(result);
    return c.json(response.body, response.status);
  });

  return route;
}

export const internalSecurityAlertAck =
  createInternalSecurityAlertAckRoute();
