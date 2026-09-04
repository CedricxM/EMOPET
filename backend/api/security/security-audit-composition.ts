import {
  isPrivilegedAction,
  isPrivilegedRole,
  type PrivilegedAction,
  type PrivilegedRole,
} from '@emopet/privileged-auth';
import {
  parseSecurityAuditEvent,
  type SecurityAuditActor,
  type SecurityAuditEvent,
} from './security-audit-event.js';

export type PrivilegedAuditCompositionResult =
  | { status: 'COMPOSED'; event: SecurityAuditEvent }
  | { status: 'INVALID_ACTION' | 'INVALID_DECISION' | 'INVALID_EVENT'; event: null };

type VerifiedDecision = {
  status: 'AUTHORIZED' | 'DENIED';
  subject: string;
  role: PrivilegedRole;
  action: PrivilegedAction;
};

type AnonymousInvalidTokenDecision = {
  status: 'DENIED';
  reason: 'invalid_token';
};

const AUTHORIZED_KEYS = Object.freeze(['status', 'subject', 'role', 'action']);
const VERIFIED_DENIAL_KEYS = Object.freeze(['status', 'reason', 'subject', 'role', 'action']);
const ANONYMOUS_DENIAL_KEYS = Object.freeze(['status', 'reason']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function parseDecision(
  input: unknown,
  requestedAction: PrivilegedAction,
): VerifiedDecision | AnonymousInvalidTokenDecision | null {
  if (!isRecord(input)) return null;

  if (input.status === 'AUTHORIZED') {
    if (!hasExactKeys(input, AUTHORIZED_KEYS)) return null;
    if (typeof input.subject !== 'string') return null;
    if (!isPrivilegedRole(input.role)) return null;
    if (!isPrivilegedAction(input.action) || input.action !== requestedAction) return null;

    return {
      status: 'AUTHORIZED',
      subject: input.subject,
      role: input.role,
      action: input.action,
    };
  }

  if (input.status !== 'DENIED') return null;

  if (input.reason === 'action_not_allowed') {
    if (!hasExactKeys(input, VERIFIED_DENIAL_KEYS)) return null;
    if (typeof input.subject !== 'string') return null;
    if (!isPrivilegedRole(input.role)) return null;
    if (!isPrivilegedAction(input.action) || input.action !== requestedAction) return null;

    return {
      status: 'DENIED',
      subject: input.subject,
      role: input.role,
      action: input.action,
    };
  }

  if (input.reason === 'invalid_token') {
    if (!hasExactKeys(input, ANONYMOUS_DENIAL_KEYS)) return null;
    return { status: 'DENIED', reason: 'invalid_token' };
  }

  return null;
}

function actorForDecision(
  decision: VerifiedDecision | AnonymousInvalidTokenDecision,
): SecurityAuditActor {
  if ('reason' in decision) {
    return { kind: 'anonymous', subject: null, role: null };
  }

  return {
    kind: 'privileged_human',
    subject: decision.subject,
    role: decision.role,
  };
}

/**
 * Convert one canonical privileged authorization decision into one bounded
 * security-audit event. This function intentionally performs no I/O and reads
 * no system clock. The final event is accepted only if the canonical
 * security-audit-v1 parser accepts the complete shape.
 */
export function composePrivilegedAuditEvent(
  decisionInput: unknown,
  requestedActionInput: unknown,
  targetInput: unknown,
  occurredAtInput: unknown,
): PrivilegedAuditCompositionResult {
  if (!isPrivilegedAction(requestedActionInput)) {
    return { status: 'INVALID_ACTION', event: null };
  }

  const decision = parseDecision(decisionInput, requestedActionInput);
  if (!decision) {
    return { status: 'INVALID_DECISION', event: null };
  }

  const verifiedDenial = !('reason' in decision) && decision.status === 'DENIED';
  const anonymousDenial = 'reason' in decision;

  const event = parseSecurityAuditEvent({
    eventType: 'privileged_authority_decision',
    occurredAt: occurredAtInput,
    actor: actorForDecision(decision),
    action: requestedActionInput,
    target: targetInput,
    outcome: decision.status === 'AUTHORIZED' ? 'allowed' : 'denied',
    reason: decision.status === 'AUTHORIZED'
      ? 'allowed'
      : verifiedDenial
        ? 'action_not_allowed'
        : anonymousDenial
          ? 'invalid_principal'
          : 'internal_error',
  });

  if (!event) {
    return { status: 'INVALID_EVENT', event: null };
  }

  return { status: 'COMPOSED', event };
}
