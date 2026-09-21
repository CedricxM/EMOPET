import {
  isPrivilegedAction,
  isPrivilegedRole,
  type PrivilegedAction,
  type PrivilegedRole,
} from '@emopet/privileged-auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REF_RE = /^[a-zA-Z0-9:._-]{1,128}$/;
const MACHINE_SUBJECT_RE = /^service:[a-zA-Z0-9._-]{1,96}$/;

export const SECURITY_AUDIT_SCHEMA_VERSION = 'security-audit-v1' as const;

export const SECURITY_AUDIT_EVENT_TYPES = [
  'privileged_authority_decision',
  'privileged_sensitive_access',
  'security_incident_access',
] as const;
export type SecurityAuditEventType = (typeof SECURITY_AUDIT_EVENT_TYPES)[number];

export const SECURITY_AUDIT_OUTCOMES = ['allowed', 'denied', 'error'] as const;
export type SecurityAuditOutcome = (typeof SECURITY_AUDIT_OUTCOMES)[number];

export const SECURITY_AUDIT_TARGET_SCOPES = [
  'account',
  'dog',
  'support_case',
  'security_incident',
  'system',
] as const;
export type SecurityAuditTargetScope = (typeof SECURITY_AUDIT_TARGET_SCOPES)[number];

export const SECURITY_AUDIT_REASON_CODES = [
  'allowed',
  'invalid_principal',
  'mfa_required',
  'action_not_allowed',
  'machine_principal_not_supported',
  'not_found',
  'internal_error',
] as const;
export type SecurityAuditReasonCode = (typeof SECURITY_AUDIT_REASON_CODES)[number];

export type SecurityAuditActor =
  | {
      kind: 'privileged_human';
      subject: string;
      role: PrivilegedRole;
    }
  | {
      kind: 'guardian';
      subject: string;
      role: null;
    }
  | {
      kind: 'machine';
      subject: string;
      role: null;
    }
  | {
      kind: 'anonymous';
      subject: null;
      role: null;
    };

export interface SecurityAuditTarget {
  scope: SecurityAuditTargetScope;
  ref: string | null;
}

export interface SecurityAuditEvent {
  schemaVersion: typeof SECURITY_AUDIT_SCHEMA_VERSION;
  eventType: SecurityAuditEventType;
  occurredAt: string;
  actor: SecurityAuditActor;
  action: PrivilegedAction;
  target: SecurityAuditTarget;
  outcome: SecurityAuditOutcome;
  reason: SecurityAuditReasonCode;
}

const TOP_LEVEL_KEYS = Object.freeze([
  'eventType',
  'occurredAt',
  'actor',
  'action',
  'target',
  'outcome',
  'reason',
]);
const ACTOR_KEYS = Object.freeze(['kind', 'subject', 'role']);
const TARGET_KEYS = Object.freeze(['scope', 'ref']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

function canonicalUtcTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.endsWith('Z')) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function parseActor(value: unknown): SecurityAuditActor | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ACTOR_KEYS)) return null;

  if (value.kind === 'anonymous') {
    return value.subject === null && value.role === null
      ? { kind: 'anonymous', subject: null, role: null }
      : null;
  }

  if (value.kind === 'machine') {
    return typeof value.subject === 'string'
      && MACHINE_SUBJECT_RE.test(value.subject)
      && value.role === null
      ? { kind: 'machine', subject: value.subject, role: null }
      : null;
  }

  if (value.kind === 'guardian') {
    return typeof value.subject === 'string'
      && UUID_RE.test(value.subject)
      && value.role === null
      ? { kind: 'guardian', subject: value.subject, role: null }
      : null;
  }

  if (value.kind === 'privileged_human') {
    if (
      typeof value.subject !== 'string'
      || !UUID_RE.test(value.subject)
      || !isPrivilegedRole(value.role)
    ) {
      return null;
    }

    return {
      kind: 'privileged_human',
      subject: value.subject,
      role: value.role,
    };
  }

  return null;
}

function parseTarget(value: unknown): SecurityAuditTarget | null {
  if (!isRecord(value) || !hasOnlyKeys(value, TARGET_KEYS)) return null;
  if (!includesString(SECURITY_AUDIT_TARGET_SCOPES, value.scope)) return null;

  const scope = value.scope as SecurityAuditTargetScope;
  if (scope === 'system') {
    return value.ref === null ? { scope, ref: null } : null;
  }

  if (typeof value.ref !== 'string' || !SAFE_REF_RE.test(value.ref)) return null;
  return { scope, ref: value.ref };
}

function reasonMatchesOutcome(outcome: SecurityAuditOutcome, reason: SecurityAuditReasonCode): boolean {
  if (outcome === 'allowed') return reason === 'allowed';
  if (outcome === 'error') return reason === 'internal_error';
  return reason !== 'allowed' && reason !== 'internal_error';
}

/**
 * Parse a bounded security-audit event without accepting free-form metadata.
 * Privileged role/action authority is delegated to @emopet/privileged-auth so
 * the audit vocabulary cannot silently diverge from the canonical RBAC source.
 */
export function parseSecurityAuditEvent(input: unknown): SecurityAuditEvent | null {
  if (!isRecord(input) || !hasOnlyKeys(input, TOP_LEVEL_KEYS)) return null;
  if (!includesString(SECURITY_AUDIT_EVENT_TYPES, input.eventType)) return null;
  if (!isPrivilegedAction(input.action)) return null;
  if (!includesString(SECURITY_AUDIT_OUTCOMES, input.outcome)) return null;
  if (!includesString(SECURITY_AUDIT_REASON_CODES, input.reason)) return null;

  const outcome = input.outcome as SecurityAuditOutcome;
  const reason = input.reason as SecurityAuditReasonCode;
  if (!reasonMatchesOutcome(outcome, reason)) return null;

  const occurredAt = canonicalUtcTimestamp(input.occurredAt);
  const actor = parseActor(input.actor);
  const target = parseTarget(input.target);
  if (!occurredAt || !actor || !target) return null;

  return {
    schemaVersion: SECURITY_AUDIT_SCHEMA_VERSION,
    eventType: input.eventType as SecurityAuditEventType,
    occurredAt,
    actor,
    action: input.action,
    target,
    outcome,
    reason,
  };
}
