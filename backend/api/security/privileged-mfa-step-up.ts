import {
  PRIVILEGED_MFA_METHODS,
  PRIVILEGED_ROLES,
  isCanonicalPrivilegedSubject,
  isPrivilegedMfaMethod,
  isPrivilegedRole,
  signPrivilegedAccessToken as signCanonicalPrivilegedAccessToken,
  verifyPrivilegedAccessToken as verifyCanonicalPrivilegedAccessToken,
  type PrivilegedMfaMethod,
  type PrivilegedRole,
  type PrivilegedTokenKeyConfig,
} from '@emopet/privileged-auth';

import { verifyAccessToken } from '../middleware/auth.js';

const MAX_POLICY_SECONDS = 60 * 60;
const SAFE_ASSURANCE_REF_RE = /^[a-zA-Z0-9:._-]{1,128}$/;

export const PRIVILEGED_MFA_ROLES = PRIVILEGED_ROLES;
export { PRIVILEGED_MFA_METHODS };
export type PrivilegedMfaRole = PrivilegedRole;
export type { PrivilegedMfaMethod };

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
    if (!isPrivilegedMfaMethod(method)) return null;
    if (!methods.includes(method)) methods.push(method);
  }

  return {
    allowedMethods: methods,
    maxAssertionAgeSeconds: value.maxAssertionAgeSeconds,
    tokenTtlSeconds: value.tokenTtlSeconds,
  };
}

function parseDirectoryRecord(value: unknown): PrivilegedDirectoryRecord | null {
  if (!isRecord(value) || !hasOnlyKeys(value, DIRECTORY_KEYS)) return null;
  if (!isCanonicalPrivilegedSubject(value.subject)) return null;
  if (!isPrivilegedRole(value.role)) return null;
  if (typeof value.active !== 'boolean') return null;
  return {
    subject: value.subject,
    role: value.role,
    active: value.active,
  };
}

function parseMfaVerification(value: unknown): PrivilegedMfaVerification | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null;

  if (value.status === 'REJECTED') {
    return hasOnlyKeys(value, REJECTED_KEYS) ? { status: 'REJECTED' } : null;
  }

  if (value.status !== 'VERIFIED' || !hasOnlyKeys(value, VERIFIED_KEYS)) return null;
  if (!isCanonicalPrivilegedSubject(value.subject)) return null;
  if (!isPrivilegedMfaMethod(value.method)) return null;
  const verifiedAt = canonicalUtcTimestamp(value.verifiedAt);
  if (!verifiedAt) return null;
  if (typeof value.assuranceRef !== 'string' || !SAFE_ASSURANCE_REF_RE.test(value.assuranceRef)) return null;

  return {
    status: 'VERIFIED',
    subject: value.subject,
    method: value.method,
    verifiedAt,
    assuranceRef: value.assuranceRef,
  };
}

function resolvePrivilegedTokenKey(): PrivilegedTokenKeyConfig {
  const configured = process.env['PRIVILEGED_JWT_SECRET']?.trim();
  const isTest = process.env['NODE_ENV'] === 'test';
  const secret = isTest && !configured
    ? 'emopet-test-only-privileged-secret-not-for-production'
    : configured ?? '';

  return {
    secret,
    ordinaryJwtSecret: process.env['JWT_SECRET']?.trim() ?? null,
  };
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
    const accessToken = await signCanonicalPrivilegedAccessToken({
      subject,
      role: privilegedIdentity.role,
      mfaMethod: verification.method,
      mfaVerifiedAt: new Date(verification.verifiedAt),
      tokenTtlSeconds: policy.tokenTtlSeconds,
      key: resolvePrivilegedTokenKey(),
      now,
    });

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
  const payload = await verifyCanonicalPrivilegedAccessToken(
    token,
    resolvePrivilegedTokenKey(),
    now,
  );

  return {
    sub: payload.sub,
    role: payload.role,
    tokenUse: payload.tokenUse,
    mfaMethod: payload.mfaMethod,
    mfaAt: payload.mfaAt,
  };
}
