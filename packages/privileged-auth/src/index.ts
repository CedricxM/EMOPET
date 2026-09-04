import * as jose from 'jose';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PRIVILEGED_TOKEN_SECONDS = 60 * 60;
const MIN_SECRET_LENGTH = 32;

export const PRIVILEGED_TOKEN_ISSUER = 'emopet-api';
export const PRIVILEGED_TOKEN_AUDIENCE = 'emopet-privileged';

export const PRIVILEGED_ROLES = ['admin', 'support', 'operator'] as const;
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];

export const PRIVILEGED_MFA_METHODS = ['webauthn', 'totp', 'idp_mfa'] as const;
export type PrivilegedMfaMethod = (typeof PRIVILEGED_MFA_METHODS)[number];

export const PRIVILEGED_ACTIONS = [
  'account.read_limited',
  'account.security_lock',
  'support.case.read_limited',
  'security.incident.read',
  'security.incident.coordinate',
  'moderation.queue.read',
  'moderation.post.manage',
  'contact.request.read',
  'contact.request.manage',
  'admin.data.read',
] as const;
export type PrivilegedAction = (typeof PRIVILEGED_ACTIONS)[number];

const ROLE_ACTIONS: Readonly<Record<PrivilegedRole, readonly PrivilegedAction[]>> = Object.freeze({
  admin: Object.freeze([...PRIVILEGED_ACTIONS]),
  support: Object.freeze([
    'account.read_limited',
    'support.case.read_limited',
  ]),
  operator: Object.freeze([
    'security.incident.read',
    'security.incident.coordinate',
  ]),
});

export interface PrivilegedTokenKeyConfig {
  secret: string;
  ordinaryJwtSecret?: string | null;
}

export interface SignPrivilegedAccessTokenInput {
  subject: string;
  role: PrivilegedRole;
  mfaMethod: PrivilegedMfaMethod;
  mfaVerifiedAt: Date;
  tokenTtlSeconds: number;
  key: PrivilegedTokenKeyConfig;
  now?: Date;
}

export interface PrivilegedAccessPayload {
  sub: string;
  role: PrivilegedRole;
  tokenUse: 'privileged';
  mfaMethod: PrivilegedMfaMethod;
  mfaAt: number;
  issuedAt: number;
  expiresAt: number;
}

export interface PrivilegedAuthorityDecision {
  allowed: boolean;
  reason: 'allowed' | 'invalid_role' | 'invalid_action' | 'action_not_allowed';
}

export type PrivilegedTokenAuthorizationResult =
  | {
      status: 'AUTHORIZED';
      subject: string;
      role: PrivilegedRole;
      action: PrivilegedAction;
      mfaMethod: PrivilegedMfaMethod;
    }
  | {
      status: 'DENIED';
      reason: 'invalid_token' | 'invalid_action' | 'action_not_allowed';
    };

function includesString(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

export function isPrivilegedRole(value: unknown): value is PrivilegedRole {
  return includesString(PRIVILEGED_ROLES, value);
}

export function isPrivilegedMfaMethod(value: unknown): value is PrivilegedMfaMethod {
  return includesString(PRIVILEGED_MFA_METHODS, value);
}

export function isPrivilegedAction(value: unknown): value is PrivilegedAction {
  return includesString(PRIVILEGED_ACTIONS, value);
}

export function isCanonicalPrivilegedSubject(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function validPositiveSeconds(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && value <= MAX_PRIVILEGED_TOKEN_SECONDS
  );
}

function resolveKey(config: PrivilegedTokenKeyConfig, requireOrdinarySeparation: boolean): Uint8Array {
  const secret = config.secret.trim();
  const ordinary = config.ordinaryJwtSecret?.trim();

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error('Privileged token secret must contain at least 32 characters');
  }
  if (requireOrdinarySeparation && ordinary && secret === ordinary) {
    throw new Error('Privileged token secret must be distinct from ordinary JWT secret');
  }

  return new TextEncoder().encode(secret);
}

export function assertPrivilegedTokenKeyConfig(config: PrivilegedTokenKeyConfig): void {
  resolveKey(config, true);
}

export function getAllowedPrivilegedActions(role: PrivilegedRole): readonly PrivilegedAction[] {
  return ROLE_ACTIONS[role];
}

export function evaluatePrivilegedAuthority(
  role: unknown,
  requestedAction: unknown,
): PrivilegedAuthorityDecision {
  if (!isPrivilegedRole(role)) return { allowed: false, reason: 'invalid_role' };
  if (!isPrivilegedAction(requestedAction)) return { allowed: false, reason: 'invalid_action' };
  if (!ROLE_ACTIONS[role].includes(requestedAction)) {
    return { allowed: false, reason: 'action_not_allowed' };
  }
  return { allowed: true, reason: 'allowed' };
}

export async function signPrivilegedAccessToken(
  input: SignPrivilegedAccessTokenInput,
): Promise<string> {
  if (!isCanonicalPrivilegedSubject(input.subject)) {
    throw new Error('Invalid privileged subject');
  }
  if (!isPrivilegedRole(input.role)) throw new Error('Invalid privileged role');
  if (!isPrivilegedMfaMethod(input.mfaMethod)) throw new Error('Invalid privileged MFA method');
  if (!validPositiveSeconds(input.tokenTtlSeconds)) {
    throw new Error('Invalid privileged token lifetime');
  }

  const now = input.now ?? new Date();
  if (!validDate(now) || !validDate(input.mfaVerifiedAt)) {
    throw new Error('Invalid privileged token timestamp');
  }

  const issuedAt = Math.floor(now.getTime() / 1_000);
  const mfaAt = Math.floor(input.mfaVerifiedAt.getTime() / 1_000);
  if (mfaAt <= 0 || mfaAt > issuedAt || issuedAt - mfaAt > MAX_PRIVILEGED_TOKEN_SECONDS) {
    throw new Error('Invalid privileged MFA chronology');
  }

  return new jose.SignJWT({
    token_use: 'privileged',
    role: input.role,
    mfa_method: input.mfaMethod,
    mfa_at: mfaAt,
    amr: ['mfa', input.mfaMethod],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.subject)
    .setIssuer(PRIVILEGED_TOKEN_ISSUER)
    .setAudience(PRIVILEGED_TOKEN_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + input.tokenTtlSeconds)
    .sign(resolveKey(input.key, true));
}

export async function verifyPrivilegedAccessToken(
  token: string,
  key: PrivilegedTokenKeyConfig,
  now = new Date(),
): Promise<PrivilegedAccessPayload> {
  if (typeof token !== 'string' || token.length < 16 || token.length > 8_192 || /\s/.test(token)) {
    throw new Error('Invalid privileged token');
  }
  if (!validDate(now)) throw new Error('Invalid privileged verification time');

  const { payload } = await jose.jwtVerify(token, resolveKey(key, true), {
    algorithms: ['HS256'],
    issuer: PRIVILEGED_TOKEN_ISSUER,
    audience: PRIVILEGED_TOKEN_AUDIENCE,
    currentDate: now,
  });

  if (!isCanonicalPrivilegedSubject(payload.sub)) throw new Error('Invalid privileged subject');
  if (payload['token_use'] !== 'privileged') throw new Error('Invalid privileged token use');
  if (!isPrivilegedRole(payload['role'])) throw new Error('Invalid privileged role');
  if (!isPrivilegedMfaMethod(payload['mfa_method'])) throw new Error('Invalid privileged MFA method');

  const mfaAt = payload['mfa_at'];
  const issuedAt = payload.iat;
  const expiresAt = payload.exp;
  if (
    typeof mfaAt !== 'number'
    || !Number.isSafeInteger(mfaAt)
    || mfaAt <= 0
    || typeof issuedAt !== 'number'
    || !Number.isSafeInteger(issuedAt)
    || issuedAt <= 0
    || typeof expiresAt !== 'number'
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= issuedAt
    || expiresAt - issuedAt > MAX_PRIVILEGED_TOKEN_SECONDS
    || mfaAt > issuedAt
    || issuedAt - mfaAt > MAX_PRIVILEGED_TOKEN_SECONDS
  ) {
    throw new Error('Invalid privileged token chronology');
  }

  const amr = payload['amr'];
  if (
    !Array.isArray(amr)
    || amr.length !== 2
    || amr[0] !== 'mfa'
    || amr[1] !== payload['mfa_method']
  ) {
    throw new Error('Invalid privileged MFA assurance claims');
  }

  return {
    sub: payload.sub,
    role: payload['role'],
    tokenUse: 'privileged',
    mfaMethod: payload['mfa_method'],
    mfaAt,
    issuedAt,
    expiresAt,
  };
}

export async function authorizePrivilegedAccessToken(input: {
  token: string;
  action: unknown;
  key: PrivilegedTokenKeyConfig;
  now?: Date;
}): Promise<PrivilegedTokenAuthorizationResult> {
  if (!isPrivilegedAction(input.action)) {
    return { status: 'DENIED', reason: 'invalid_action' };
  }

  let payload: PrivilegedAccessPayload;
  try {
    payload = await verifyPrivilegedAccessToken(input.token, input.key, input.now);
  } catch {
    return { status: 'DENIED', reason: 'invalid_token' };
  }

  const decision = evaluatePrivilegedAuthority(payload.role, input.action);
  if (!decision.allowed) {
    return { status: 'DENIED', reason: 'action_not_allowed' };
  }

  return {
    status: 'AUTHORIZED',
    subject: payload.sub,
    role: payload.role,
    action: input.action,
    mfaMethod: payload.mfaMethod,
  };
}
