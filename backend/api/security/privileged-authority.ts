const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PRIVILEGED_HUMAN_ROLES = ['admin', 'support', 'operator'] as const;
export type PrivilegedHumanRole = (typeof PRIVILEGED_HUMAN_ROLES)[number];

export const PRIVILEGED_ACTIONS = [
  'account.read_limited',
  'account.security_lock',
  'support.case.read_limited',
  'security.incident.read',
  'security.incident.coordinate',
] as const;
export type PrivilegedAction = (typeof PRIVILEGED_ACTIONS)[number];

export interface PrivilegedHumanPrincipal {
  kind: 'human';
  subject: string;
  role: PrivilegedHumanRole;
  mfaVerified: boolean;
}

export interface MachinePrincipal {
  kind: 'machine';
  subject: string;
  role: 'service';
}

export type PrivilegedPrincipal = PrivilegedHumanPrincipal | MachinePrincipal;

export interface PrivilegedAuthorityDecision {
  allowed: boolean;
  reason:
    | 'allowed'
    | 'invalid_principal'
    | 'mfa_required'
    | 'action_not_allowed'
    | 'machine_principal_not_supported';
}

const ROLE_ACTIONS: Readonly<Record<PrivilegedHumanRole, readonly PrivilegedAction[]>> = Object.freeze({
  admin: Object.freeze([
    'account.read_limited',
    'account.security_lock',
    'support.case.read_limited',
    'security.incident.read',
    'security.incident.coordinate',
  ]),
  support: Object.freeze([
    'account.read_limited',
    'support.case.read_limited',
  ]),
  operator: Object.freeze([
    'security.incident.read',
    'security.incident.coordinate',
  ]),
});

function isPrivilegedHumanRole(value: unknown): value is PrivilegedHumanRole {
  return typeof value === 'string' && (PRIVILEGED_HUMAN_ROLES as readonly string[]).includes(value);
}

function isPrivilegedAction(value: unknown): value is PrivilegedAction {
  return typeof value === 'string' && (PRIVILEGED_ACTIONS as readonly string[]).includes(value);
}

export function evaluatePrivilegedAuthority(
  principal: unknown,
  requestedAction: unknown,
): PrivilegedAuthorityDecision {
  if (!isPrivilegedAction(requestedAction)) {
    return { allowed: false, reason: 'action_not_allowed' };
  }

  if (!principal || typeof principal !== 'object') {
    return { allowed: false, reason: 'invalid_principal' };
  }

  const candidate = principal as Partial<PrivilegedPrincipal> & Record<string, unknown>;

  if (candidate.kind === 'machine') {
    return { allowed: false, reason: 'machine_principal_not_supported' };
  }

  if (
    candidate.kind !== 'human'
    || typeof candidate.subject !== 'string'
    || !UUID_RE.test(candidate.subject)
    || !isPrivilegedHumanRole(candidate.role)
  ) {
    return { allowed: false, reason: 'invalid_principal' };
  }

  if (candidate.mfaVerified !== true) {
    return { allowed: false, reason: 'mfa_required' };
  }

  if (!ROLE_ACTIONS[candidate.role].includes(requestedAction)) {
    return { allowed: false, reason: 'action_not_allowed' };
  }

  return { allowed: true, reason: 'allowed' };
}

export function getAllowedPrivilegedActions(role: PrivilegedHumanRole): readonly PrivilegedAction[] {
  return ROLE_ACTIONS[role];
}
