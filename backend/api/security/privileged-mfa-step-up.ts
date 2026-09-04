import * as jose from 'jose';

import { isCanonicalUserId } from '../services/auth-security.js';
import { verifyAccessToken } from '../middleware/auth.js';

const PRIVILEGED_JWT_ISSUER = 'emopet-api';
const PRIVILEGED_JWT_AUDIENCE = 'emopet-privileged';
const MAX_POLICY_SECONDS = 60 * 60;
const SAFE_ASSURANCE_REF_RE = /^[a-zA-Z0-9:._-]{1,128}$/;

export const PRIVILEGED_MFA_ROLES = ['admin', 'support', 'operator'] as const;
export type PrivilegedMfaRole = (typeof PRIVILEGED_MFA_ROLES)[number];

export const PRIVILEGED_MFA_METHODS = ['webauthn', 'totp', 'idp_mfa'] as const;
export type PrivilegedMfaMethod = (typeof PRIVILEGED_MFA_METHODS)[number];

export interface PrivilegedStepUpPolicy {
  allowedMethods: readonly PrivilegedMfaMethod[];
  maxAssertionAgeSeconds: number;
  tokenTtlSeconds: number;
}

export interface PrivilegedDirectoryRecord {
  subject: string;
  role: PrivilegedMfaRole;
  active: boolean;
}

export interface PrivilegedIdentityDirectory {
  findBySubject(subject: string): Promise<unknown>;
}

export type PrivilegedMfaVerification =
  | {
      status: 'VERIFIED';
      subject: string;
      method: PrivilegedMfaMethod;
      verifiedAt: string;
      assuranceRef: string;
    }
  | {
      status: 'REJECTED';
    };

export interface PrivilegedMfaVerifier {
  verify(input: {
    subject: string;
    assertion: unknown;
    requestedAt: string;
  }): Promise<unknown>;
}

export type PrivilegedStepUpDeniedReason =
  | 'invalid_policy'
  | 'invalid_base_session'
  | 'privileged_identity_not_found'
  | 'privileged_identity_inactive'
  | 'mfa_rejected'
  | 'mfa_verification_failed'
  | 'mfa_subject_mismatch'
  | 'mfa_method_not_allowed'
  | 'mfa_assertion_stale'
  | 'mfa_assertion_from_future'
  | 'configuration_error';

export type PrivilegedStepUpResult =
  | {
      status: 'GRANTED';
      subject: string;
      role: PrivilegedMfaRole;
      mfaMethod: PrivilegedMfaMethod;
      mfaVerifiedAt: string;
      accessToken: string;
      expiresInSeconds: number;
    }
  | {
      status: 'DENIED';
      reason: PrivilegedStepUpDeniedReason;
    };

export interface PrivilegedAccessPayload {
  sub: string;
  role: PrivilegedMfaRole;
  tokenUse: 'privileged';
  mfaMethod: PrivilegedMfaMethod;
  mfaAt: number;
}

const DIRECTORY_KEYS = Object.freeze(['subject', 'role', 'active']);
const VERIFIED_KEYS = Object.freeze(['status', 'subject', 'method', 'verifiedAt', 'assuranceRef']);
const REJECTED_KEYS = Object.freeze(['status']);
const POLICY_KEYS = Object.freeze(['allowedMethods', 'maxAssertionAgeSeconds', 'tokenTtlSeconds']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function parsePolicy(value: unknown): PrivilegedStepUpPolicy | null {
  if (!isRecord(value) || !hasOnlyKeys(value, POLICY_KEYS)) return null;
  if (!Array.isArray(value.allowedMethods) || value.allowedMethods.length === 0) return null;
  if (!isSafePositiveInteger(value.maxAssertionAgeSeconds) || value.maxAssertionAgeSeconds > MAX_POLICY_SECONDS) {
    return null;
  }
  if (!isSafePositiveInteger(value.tokenTtlSeconds) || value.tokenTtlSeconds > MAX_POLICY_SECONDS) {
    return null;
  }

  const methods: PrivilegedMfaMethod[] = [];
  for (const method of value.allowedMethods) {
    if (!includesString(PRIVILEGED_MFA_METHODS, method)) return null;
    if (!methods.includes(method as PrivilegedMfaMethod)) methods.push(method as PrivilegedMfaMethod);
  }

  return {
    allowedMethods: methods,
    maxAssertionAgeSeconds: value.maxAssertionAgeSeconds,
    tokenTtlSeconds: value.tokenTtlSeconds,
  };
}

function parseDirectoryRecord(value: unknown): PrivilegedDirectoryRecord | null {
  if (!isRecord(value) || !hasOnlyKeys(value, DIRECTORY_KEYS)) return null;
  if (!isCanonicalUserId(value.subject)) return null;
  if (!includesString(PRIVILEGED_MFA_ROLES, value.role)) return null;
  if (typeof value.active !== 'boolean') return null;
  return {
    subject: value.subject,
    role: value.role as PrivilegedMfaRole,
    active: value.active,
  };
}

function parseMfaVerification(value: unknown): PrivilegedMfaVerification | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null;

  if (value.status === 'REJECTED') {
    return hasOnlyKeys(value, REJECTED_KEYS) ? { status: 'REJECTED' } : null;
  }

  if (value.status !== 'VERIFIED' || !hasOnlyKeys(value, VERIFIED_KEYS)) return null;
  if (!isCanonicalUserId(value.subject)) return null;
  if (!includesString(PRIVILEGED_MFA_METHODS, value.method)) return null;
  const verifiedAt = canonicalUtcTimestamp(value.verifiedAt);
  if (!verifiedAt) return null;
  if (typeof value.assuranceRef !== 'string' || !SAFE_ASSURANCE_REF_RE.test(value.assuranceRef)) return null;

  return {
    status: 'VERIFIED',
    subject: value.subject,
    method: value.method as PrivilegedMfaMethod,
    verifiedAt,
    assuranceRef: value.assuranceRef,
  };
}

function resolvePrivilegedJwtSecret(): Uint8Array {
  const secret = process.env['PRIVILEGED_JWT_SECRET']?.trim();
  const ordinaryJwtSecret = process.env['JWT_SECRET']?.trim();
  const isTest = process.env['NODE_ENV'] === 'test';

  if (isTest && !secret) {
    return new TextEncoder().encode('emopet-test-only-privileged-secret-not-for-production');
  }

  if (!secret || secret.length < 32) {
    throw new Error('PRIVILEGED_JWT_SECRET must be configured with at least 32 characters');
  }
  if (ordinaryJwtSecret && secret === ordinaryJwtSecret) {
    throw new Error('PRIVILEGED_JWT_SECRET must be distinct from JWT_SECRET');
  }

  return new TextEncoder().encode(secret);
}

async function signPrivilegedAccessToken(
  subject: string,
  role: PrivilegedMfaRole,
  method: PrivilegedMfaMethod,
  verifiedAt: string,
  policy: PrivilegedStepUpPolicy,
  now: Date,
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const expiresAt = issuedAt + policy.tokenTtlSeconds;
  const mfaAt = Math.floor(Date.parse(verifiedAt) / 1_000);

  return new jose.SignJWT({
    token_use: 'privileged',
    role,
    mfa_method: method,
    mfa_at: mfaAt,
    amr: ['mfa', method],
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuer(PRIVILEGED_JWT_ISSUER)
    .setAudience(PRIVILEGED_JWT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(resolvePrivilegedJwtSecret());
}

export async function completePrivilegedMfaStepUp(input: {
  baseAccessToken: string;
  assertion: unknown;
  policy: unknown;
  directory: PrivilegedIdentityDirectory;
  verifier: PrivilegedMfaVerifier;
  now?: Date;
}): Promise<PrivilegedStepUpResult> {
  const policy = parsePolicy(input.policy);
  if (!policy) return { status: 'DENIED', reason: 'invalid_policy' };

  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) return { status: 'DENIED', reason: 'invalid_policy' };

  let subject: string;
  try {
    const base = await verifyAccessToken(input.baseAccessToken);
    subject = base.sub;
  } catch {
    return { status: 'DENIED', reason: 'invalid_base_session' };
  }

  let directoryValue: unknown;
  try {
    directoryValue = await input.directory.findBySubject(subject);
  } catch {
    return { status: 'DENIED', reason: 'privileged_identity_not_found' };
  }

  const privilegedIdentity = parseDirectoryRecord(directoryValue);
  if (!privilegedIdentity || privilegedIdentity.subject !== subject) {
    return { status: 'DENIED', reason: 'privileged_identity_not_found' };
  }
  if (!privilegedIdentity.active) {
    return { status: 'DENIED', reason: 'privileged_identity_inactive' };
  }

  let rawVerification: unknown;
  try {
    rawVerification = await input.verifier.verify({
      subject,
      assertion: input.assertion,
      requestedAt: now.toISOString(),
    });
  } catch {
    return { status: 'DENIED', reason: 'mfa_verification_failed' };
  }

  const verification = parseMfaVerification(rawVerification);
  if (!verification) return { status: 'DENIED', reason: 'mfa_verification_failed' };
  if (verification.status === 'REJECTED') return { status: 'DENIED', reason: 'mfa_rejected' };
  if (verification.subject !== subject) return { status: 'DENIED', reason: 'mfa_subject_mismatch' };
  if (!policy.allowedMethods.includes(verification.method)) {
    return { status: 'DENIED', reason: 'mfa_method_not_allowed' };
  }

  const verifiedAtMs = Date.parse(verification.verifiedAt);
  const nowMs = now.getTime();
  if (verifiedAtMs > nowMs) return { status: 'DENIED', reason: 'mfa_assertion_from_future' };
  if (nowMs - verifiedAtMs > policy.maxAssertionAgeSeconds * 1_000) {
    return { status: 'DENIED', reason: 'mfa_assertion_stale' };
  }

  try {
    const accessToken = await signPrivilegedAccessToken(
      subject,
      privilegedIdentity.role,
      verification.method,
      verification.verifiedAt,
      policy,
      now,
    );

    return {
      status: 'GRANTED',
      subject,
      role: privilegedIdentity.role,
      mfaMethod: verification.method,
      mfaVerifiedAt: verification.verifiedAt,
      accessToken,
      expiresInSeconds: policy.tokenTtlSeconds,
    };
  } catch {
    return { status: 'DENIED', reason: 'configuration_error' };
  }
}

export async function verifyPrivilegedAccessToken(
  token: string,
  now = new Date(),
): Promise<PrivilegedAccessPayload> {
  const { payload } = await jose.jwtVerify(token, resolvePrivilegedJwtSecret(), {
    algorithms: ['HS256'],
    issuer: PRIVILEGED_JWT_ISSUER,
    audience: PRIVILEGED_JWT_AUDIENCE,
    currentDate: now,
  });

  if (!isCanonicalUserId(payload.sub)) throw new Error('Invalid privileged subject');
  if (payload['token_use'] !== 'privileged') throw new Error('Invalid privileged token use');
  if (!includesString(PRIVILEGED_MFA_ROLES, payload['role'])) throw new Error('Invalid privileged role');
  if (!includesString(PRIVILEGED_MFA_METHODS, payload['mfa_method'])) throw new Error('Invalid MFA method');

  const mfaAt = payload['mfa_at'];
  const issuedAt = payload.iat;
  const amr = payload['amr'];
  if (typeof mfaAt !== 'number' || !Number.isSafeInteger(mfaAt) || mfaAt <= 0) {
    throw new Error('Invalid MFA timestamp');
  }
  if (typeof issuedAt !== 'number' || !Number.isSafeInteger(issuedAt) || mfaAt > issuedAt) {
    throw new Error('Invalid privileged token chronology');
  }
  if (!Array.isArray(amr) || amr.length !== 2 || amr[0] !== 'mfa' || amr[1] !== payload['mfa_method']) {
    throw new Error('Invalid MFA assurance claims');
  }

  return {
    sub: payload.sub,
    role: payload['role'] as PrivilegedMfaRole,
    tokenUse: 'privileged',
    mfaMethod: payload['mfa_method'] as PrivilegedMfaMethod,
    mfaAt,
  };
}
