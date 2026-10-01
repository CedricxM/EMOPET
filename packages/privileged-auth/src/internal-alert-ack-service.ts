import * as jose from 'jose';

const INTERNAL_ALERT_ACK_MIN_SECRET_LENGTH = 32;
const INTERNAL_ALERT_ACK_TTL_SECONDS = 30;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export const INTERNAL_ALERT_ACK_TOKEN_ISSUER = 'emopet-web';
export const INTERNAL_ALERT_ACK_TOKEN_AUDIENCE =
  'emopet-internal-security-alert-ack';
export const INTERNAL_ALERT_ACK_TOKEN_SUBJECT = 'service:web';

export interface InternalAlertAckServiceKeyConfig {
  secret: string;
  ordinaryJwtSecret?: string | null;
  privilegedJwtSecret?: string | null;
  internalAuditServiceSecret?: string | null;
}

export interface InternalAlertAckServiceTokenPayload {
  requestId: string;
  bodySha256: string;
  issuedAt: number;
  expiresAt: number;
}

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function resolveInternalAlertAckKey(
  config: InternalAlertAckServiceKeyConfig,
): Uint8Array {
  const secret = config.secret.trim();
  const ordinary = config.ordinaryJwtSecret?.trim();
  const privileged = config.privilegedJwtSecret?.trim();
  const audit = config.internalAuditServiceSecret?.trim();

  if (secret.length < INTERNAL_ALERT_ACK_MIN_SECRET_LENGTH) {
    throw new Error(
      'Internal alert acknowledgement service secret must contain at least 32 characters',
    );
  }
  if (
    (ordinary && secret === ordinary)
    || (privileged && secret === privileged)
    || (audit && secret === audit)
  ) {
    throw new Error(
      'Internal alert acknowledgement service secret must be distinct from user and audit secrets',
    );
  }

  return new TextEncoder().encode(secret);
}

async function sha256Hex(body: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body),
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0')).join('');
}

export function assertInternalAlertAckServiceKeyConfig(
  config: InternalAlertAckServiceKeyConfig,
): void {
  resolveInternalAlertAckKey(config);
}

export async function signInternalAlertAckServiceToken(input: {
  requestId: string;
  body: string;
  key: InternalAlertAckServiceKeyConfig;
  now?: Date;
}): Promise<string> {
  if (!UUID_RE.test(input.requestId)) {
    throw new Error('Invalid internal alert acknowledgement request id');
  }

  const now = input.now ?? new Date();
  if (!validDate(now)) {
    throw new Error('Invalid internal alert acknowledgement token timestamp');
  }

  const issuedAt = Math.floor(now.getTime() / 1_000);
  const bodySha256 = await sha256Hex(input.body);

  return new jose.SignJWT({
    token_use: 'internal_security_alert_ack',
    body_sha256: bodySha256,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(INTERNAL_ALERT_ACK_TOKEN_SUBJECT)
    .setIssuer(INTERNAL_ALERT_ACK_TOKEN_ISSUER)
    .setAudience(INTERNAL_ALERT_ACK_TOKEN_AUDIENCE)
    .setJti(input.requestId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + INTERNAL_ALERT_ACK_TTL_SECONDS)
    .sign(resolveInternalAlertAckKey(input.key));
}

export async function verifyInternalAlertAckServiceToken(input: {
  token: string;
  body: string;
  key: InternalAlertAckServiceKeyConfig;
  now?: Date;
}): Promise<InternalAlertAckServiceTokenPayload> {
  if (
    typeof input.token !== 'string'
    || input.token.length < 16
    || input.token.length > 8_192
    || /\s/.test(input.token)
  ) {
    throw new Error('Invalid internal alert acknowledgement service token');
  }

  const now = input.now ?? new Date();
  if (!validDate(now)) {
    throw new Error('Invalid internal alert acknowledgement verification time');
  }

  const { payload } = await jose.jwtVerify(
    input.token,
    resolveInternalAlertAckKey(input.key),
    {
      algorithms: ['HS256'],
      issuer: INTERNAL_ALERT_ACK_TOKEN_ISSUER,
      audience: INTERNAL_ALERT_ACK_TOKEN_AUDIENCE,
      subject: INTERNAL_ALERT_ACK_TOKEN_SUBJECT,
      currentDate: now,
    },
  );

  if (payload['token_use'] !== 'internal_security_alert_ack') {
    throw new Error('Invalid internal alert acknowledgement token use');
  }
  if (typeof payload.jti !== 'string' || !UUID_RE.test(payload.jti)) {
    throw new Error('Invalid internal alert acknowledgement request id');
  }

  const bodySha256 = payload['body_sha256'];
  if (typeof bodySha256 !== 'string' || !SHA256_HEX_RE.test(bodySha256)) {
    throw new Error('Invalid internal alert acknowledgement body digest');
  }

  const actualDigest = await sha256Hex(input.body);
  if (actualDigest !== bodySha256) {
    throw new Error('Internal alert acknowledgement body digest mismatch');
  }

  const issuedAt = payload.iat;
  const expiresAt = payload.exp;
  if (
    typeof issuedAt !== 'number'
    || !Number.isSafeInteger(issuedAt)
    || issuedAt <= 0
    || typeof expiresAt !== 'number'
    || !Number.isSafeInteger(expiresAt)
    || expiresAt - issuedAt !== INTERNAL_ALERT_ACK_TTL_SECONDS
  ) {
    throw new Error('Invalid internal alert acknowledgement token chronology');
  }

  return {
    requestId: payload.jti,
    bodySha256,
    issuedAt,
    expiresAt,
  };
}
