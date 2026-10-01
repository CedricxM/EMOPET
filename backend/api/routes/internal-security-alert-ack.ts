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
  'actorSubject',
  'actorRole',
  'acknowledgedAt',
]);

type AcknowledgeAlert = (input: unknown) => Promise<SecurityAlertAcknowledgementResult>;

export interface InternalSecurityAlertAckRouteOptions {
  acknowledge?: AcknowledgeAlert;
  now?: () => Date;
  keyProvider?: () => InternalAlertAckServiceKeyConfig;
}

function hasExactBodyKeys(value: unknown): value is {
  alertId: unknown;
  actorSubject: unknown;
  actorRole: unknown;
  acknowledgedAt: unknown;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === BODY_KEYS.length
    && keys.every((key) => BODY_KEYS.includes(key));
}

function readBearer(value: string | undefined): string | null {
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  if (token.length < 16 || token.length > 8_192 || /\s/.test(token)) return null;
  return token;
}

function keyFromEnvironment(): InternalAlertAckServiceKeyConfig {
  return {
    secret: process.env['EMOPET_INTERNAL_ALERT_ACK_SERVICE_SECRET'] ?? '',
    ordinaryJwtSecret: process.env['JWT_SECRET'] ?? null,
    privilegedJwtSecret: process.env['PRIVILEGED_JWT_SECRET'] ?? null,
    internalAuditServiceSecret:
      process.env['EMOPET_INTERNAL_AUDIT_SERVICE_SECRET'] ?? null,
  };
}

export function createInternalSecurityAlertAckRoute(
  options: InternalSecurityAlertAckRouteOptions = {},
) {
  const route = new Hono();
  const acknowledge = options.acknowledge ?? acknowledgeSecurityAlert;
  const now = options.now ?? (() => new Date());
  const keyProvider = options.keyProvider ?? keyFromEnvironment;

  route.post('/', async (c) => {
    c.header('Cache-Control', 'no-store');
    c.header('X-Content-Type-Options', 'nosniff');

    const contentLength = Number(c.req.header('content-length') ?? '0');
    if (
      !Number.isFinite(contentLength)
      || contentLength < 0
      || contentLength > MAX_INTERNAL_ALERT_ACK_BODY_BYTES
    ) {
      return c.json({ ok: false, error: 'invalid_alert_ack_payload' }, 400);
    }

    const bodyText = await c.req.text();
    if (
      bodyText.length === 0
      || new TextEncoder().encode(bodyText).byteLength
        > MAX_INTERNAL_ALERT_ACK_BODY_BYTES
    ) {
      return c.json({ ok: false, error: 'invalid_alert_ack_payload' }, 400);
    }

    const token = readBearer(c.req.header('authorization'));
    if (!token) {
      return c.json({ ok: false, error: 'internal_alert_ack_auth_failed' }, 401);
    }

    let serviceToken: Awaited<
      ReturnType<typeof verifyInternalAlertAckServiceToken>
    >;
    try {
      serviceToken = await verifyInternalAlertAckServiceToken({
        token,
        body: bodyText,
        key: keyProvider(),
        now: now(),
      });
    } catch {
      return c.json({ ok: false, error: 'internal_alert_ack_auth_failed' }, 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return c.json({ ok: false, error: 'invalid_alert_ack_payload' }, 400);
    }

    if (!hasExactBodyKeys(payload)) {
      return c.json({ ok: false, error: 'invalid_alert_ack_payload' }, 400);
    }

    const result = await acknowledge({
      requestId: serviceToken.requestId,
      alertId: payload.alertId,
      actorSubject: payload.actorSubject,
      actorRole: payload.actorRole,
      acknowledgedAt: payload.acknowledgedAt,
    });

    if (result.status === 'ACKNOWLEDGED' || result.status === 'DEDUPED') {
      return c.json(
        {
          ok: true,
          acknowledged: true,
          duplicate: result.status === 'DEDUPED',
        },
        result.status === 'DEDUPED' ? 200 : 201,
      );
    }

    if (result.status === 'UNKNOWN_ALERT') {
      return c.json({ ok: false, error: 'security_alert_not_found' }, 404);
    }
    if (result.status === 'ACK_CONFLICT') {
      return c.json({ ok: false, error: 'security_alert_ack_conflict' }, 409);
    }
    if (result.status === 'DATABASE_UNAVAILABLE') {
      return c.json({ ok: false, error: 'security_alert_ack_unavailable' }, 503);
    }

    return c.json({ ok: false, error: 'invalid_alert_ack_payload' }, 400);
  });

  return route;
}

export const internalSecurityAlertAck =
  createInternalSecurityAlertAckRoute();
