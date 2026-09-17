const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_BEARER_LENGTH = 16;
const MAX_BEARER_LENGTH = 8_192;

export type PrivilegedWebAction = 'moderation.queue.read';

export interface PrivilegedAuthorizationVerifier {
  authorize(input: {
    token: string;
    action: PrivilegedWebAction;
  }): Promise<unknown>;
}

export type PrivilegedRequestDecision =
  | {
      status: 'AUTHORIZED';
      subject: string;
      action: PrivilegedWebAction;
    }
  | {
      status: 'DENIED';
      reason: 'missing_bearer' | 'invalid_bearer' | 'not_authorized';
    }
  | {
      status: 'UNAVAILABLE';
      reason: 'verifier_unavailable' | 'verifier_invalid_result';
    };

const AUTHORIZED_KEYS = Object.freeze(['status', 'subject', 'action']);
const TERMINAL_KEYS = Object.freeze(['status']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function readBearer(req: Request): { ok: true; token: string } | { ok: false; reason: 'missing_bearer' | 'invalid_bearer' } {
  const header = req.headers.get('authorization');
  if (!header) return { ok: false, reason: 'missing_bearer' };
  if (!header.startsWith('Bearer ')) return { ok: false, reason: 'invalid_bearer' };

  const token = header.slice(7).trim();
  if (
    token.length < MIN_BEARER_LENGTH
    || token.length > MAX_BEARER_LENGTH
    || /\s/.test(token)
  ) {
    return { ok: false, reason: 'invalid_bearer' };
  }

  return { ok: true, token };
}

function parseVerifierDecision(
  value: unknown,
  expectedAction: PrivilegedWebAction,
): PrivilegedRequestDecision {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' };
  }

  if (value.status === 'DENIED') {
    if (!hasOnlyKeys(value, TERMINAL_KEYS)) {
      return { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' };
    }
    return { status: 'DENIED', reason: 'not_authorized' };
  }

  if (value.status === 'UNAVAILABLE') {
    if (!hasOnlyKeys(value, TERMINAL_KEYS)) {
      return { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' };
    }
    return { status: 'UNAVAILABLE', reason: 'verifier_unavailable' };
  }

  if (value.status !== 'AUTHORIZED' || !hasOnlyKeys(value, AUTHORIZED_KEYS)) {
    return { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' };
  }

  if (
    typeof value.subject !== 'string'
    || !UUID_RE.test(value.subject)
    || value.action !== expectedAction
  ) {
    return { status: 'UNAVAILABLE', reason: 'verifier_invalid_result' };
  }

  return {
    status: 'AUTHORIZED',
    subject: value.subject,
    action: expectedAction,
  };
}

export async function authorizePrivilegedRequest(
  req: Request,
  action: PrivilegedWebAction,
  verifier: PrivilegedAuthorizationVerifier,
): Promise<PrivilegedRequestDecision> {
  const bearer = readBearer(req);
  if (!bearer.ok) return { status: 'DENIED', reason: bearer.reason };

  let rawDecision: unknown;
  try {
    rawDecision = await verifier.authorize({ token: bearer.token, action });
  } catch {
    return { status: 'UNAVAILABLE', reason: 'verifier_unavailable' };
  }

  return parseVerifierDecision(rawDecision, action);
}

/**
 * Production-safe placeholder until the canonical @emopet/privileged-auth
 * verifier selected by #177 is wired into the Next.js server boundary.
 * It intentionally cannot authorize anyone.
 */
export const unavailablePrivilegedAuthorizationVerifier: PrivilegedAuthorizationVerifier = Object.freeze({
  async authorize() {
    return { status: 'UNAVAILABLE' as const };
  },
});
