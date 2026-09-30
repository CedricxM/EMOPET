import * as jose from 'jose';

const INTERNAL_AUDIT_MIN_SECRET_LENGTH = 32;
const INTERNAL_AUDIT_TTL_SECONDS = 30;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export const INTERNAL_AUDIT_TOKEN_ISSUER = 'emopet-web';
export const INTERNAL_AUDIT_TOKEN_AUDIENCE = 'emopet-internal-security-audit';
export const INTERNAL_AUDIT_TOKEN_SUBJECT = 'service:web';

export interface InternalAuditServiceKeyConfig {
  secret: string;
  ordinaryJwtSecret?: string | null;
  privilegedJwtSecret?: string | null;
}

export interface InternalAuditServiceTokenPayload {
  eventId: string;
  bodySha256: string;
  issuedAt: number;
  expiresAt: number;
}

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function resolveInternalAuditKey(config: InternalAuditServiceKeyConfig): Uint8Array {
  const secret = config.secret.trim();
  const ordinary = config.ordinaryJwtSecret?.trim();
  const privileged = config.privilegedJwtSecret?.trim();

  if (secret.length < INTERNAL_AUDIT_MIN_SECRET_LENGTH) {
    throw new Error('Internal audit service secret must contain at least 32 characters');
  }
  if ((ordinary && secret === ordinary) || (privileged && secret === privileged)) {
    throw new Error('Internal audit service secret must be distinct from user JWT secrets');
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

export function assertInternalAuditServiceKeyConfig(
  config: InternalAuditServiceKeyConfig,
): void {
  resolveInternalAuditKey(config);
}

export async function signInternalAuditServiceToken(input: {
  eventId: string;
  body: string;
  key: InternalAuditServiceKeyConfig;
  now?: Date;
}): Promise<string> {
  if (!UUID_RE.test(input.eventId)) {
    throw new Error('Invalid internal audit event id');
  }

  const now = input.now ?? new Date();
  if (!validDate(now)) {
    throw new Error('Invalid internal audit token timestamp');
  }

  const issuedAt = Math.floor(now.getTime() / 1_000);
  const bodySha256 = await sha256Hex(input.body);

  return new jose.SignJWT({
    token_use: 'internal_audit_emit',
    body_sha256: bodySha256,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(INTERNAL_AUDIT_TOKEN_SUBJECT)
    .setIssuer(INTERNAL_AUDIT_TOKEN_ISSUER)
    .setAudience(INTERNAL_AUDIT_TOKEN_AUDIENCE)
    .setJti(input.eventId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + INTERNAL_AUDIT_TTL_SECONDS)
    .sign(resolveInternalAuditKey(input.key));
}

export async function verifyInternalAuditServiceToken(input: {
  token: string;
  body: string;
  key: InternalAuditServiceKeyConfig;
  now?: Date;
}): Promise<InternalAuditServiceTokenPayload> {
  if (
    typeof input.token !== 'string'
    || input.token.length < 16
    || input.token.length > 8_192
    || /\s/.test(input.token)
  ) {
    throw new Error('Invalid internal audit service token');
  }

  const now = input.now ?? new Date();
  if (!validDate(now)) {
    throw new Error('Invalid internal audit verification time');
  }

  const { payload } = await jose.jwtVerify(
    input.token,
    resolveInternalAuditKey(input.key),
    {
      algorithms: ['HS256'],
      issuer: INTERNAL_AUDIT_TOKEN_ISSUER,
      audience: INTERNAL_AUDIT_TOKEN_AUDIENCE,
      subject: INTERNAL_AUDIT_TOKEN_SUBJECT,
      currentDate: now,
    },
  );

  if (payload['token_use'] !== 'internal_audit_emit') {
    throw new Error('Invalid internal audit token use');
  }
  if (typeof payload.jti !== 'string' || !UUID_RE.test(payload.jti)) {
    throw new Error('Invalid internal audit event id');
  }

  const bodySha256 = payload['body_sha256'];
  if (typeof bodySha256 !== 'string' || !SHA256_HEX_RE.test(bodySha256)) {
    throw new Error('Invalid internal audit body digest');
  }

  const actualDigest = await sha256Hex(input.body);
  if (actualDigest !== bodySha256) {
    throw new Error('Internal audit body digest mismatch');
  }

  const issuedAt = payload.iat;
  const expiresAt = payload.exp;
  if (
    typeof issuedAt !== 'number'
    || !Number.isSafeInteger(issuedAt)
    || issuedAt <= 0
    || typeof expiresAt !== 'number'
    || !Number.isSafeInteger(expiresAt)
    || expiresAt - issuedAt !== INTERNAL_AUDIT_TTL_SECONDS
  ) {
    throw new Error('Invalid internal audit token chronology');
  }

  return {
    eventId: payload.jti,
    bodySha256,
    issuedAt,
    expiresAt,
  };
}
