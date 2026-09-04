import {
  enumerateBreachRecipients,
  type BreachRecipientGap,
  type BreachRecipientResolver,
} from './breach-recipient-enumerator.js';

export const BREACH_TABLETOP_VERSION = 'breach-tabletop-v1' as const;
export const BREACH_TABLETOP_MODE = 'TABLETOP_NO_SEND' as const;

export const BREACH_NOTIFICATION_DECISIONS = ['NOTIFY', 'DO_NOT_NOTIFY', 'UNRESOLVED'] as const;
export type BreachNotificationDecision = (typeof BREACH_NOTIFICATION_DECISIONS)[number];

export const BREACH_DECISION_AUTHORITY_ROLES = [
  'incident_commander',
  'privacy_dpo',
  'legal_regulatory',
] as const;
export type BreachDecisionAuthorityRole = (typeof BREACH_DECISION_AUTHORITY_ROLES)[number];

export interface BreachDecisionRecord {
  outcome: BreachNotificationDecision;
  decidedAt: string;
  authorityRole: BreachDecisionAuthorityRole;
}

export interface SimulatedBreachNotificationTask {
  personRef: string;
  delivery: 'SIMULATED_NOT_SENT';
}

export interface BreachTabletopResult {
  version: typeof BREACH_TABLETOP_VERSION;
  mode: typeof BREACH_TABLETOP_MODE;
  status: 'INVALID_INPUT' | 'BLOCKED_RECIPIENT_SCOPE' | 'BLOCKED_DECISION' | 'COMPLETE';
  incidentId: string | null;
  awarenessAt: string | null;
  affectedObjectCount: number;
  recipientStatus: 'COMPLETE' | 'INCOMPLETE' | null;
  recipients: readonly string[];
  recipientGaps: readonly BreachRecipientGap[];
  decision: BreachDecisionRecord | null;
  notificationTasks: readonly SimulatedBreachNotificationTask[];
}

const INPUT_KEYS = Object.freeze(['incidentId', 'awarenessAt', 'affectedObjects', 'decision']);
const DECISION_KEYS = Object.freeze(['outcome', 'decidedAt', 'authorityRole']);
const INCIDENT_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

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
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

function parseDecision(value: unknown): BreachDecisionRecord | null {
  if (!isRecord(value) || !hasOnlyKeys(value, DECISION_KEYS)) return null;
  if (!includesString(BREACH_NOTIFICATION_DECISIONS, value.outcome)) return null;
  if (!includesString(BREACH_DECISION_AUTHORITY_ROLES, value.authorityRole)) return null;
  const decidedAt = canonicalUtcTimestamp(value.decidedAt);
  if (!decidedAt) return null;

  return {
    outcome: value.outcome as BreachNotificationDecision,
    decidedAt,
    authorityRole: value.authorityRole as BreachDecisionAuthorityRole,
  };
}

function invalidResult(): BreachTabletopResult {
  return {
    version: BREACH_TABLETOP_VERSION,
    mode: BREACH_TABLETOP_MODE,
    status: 'INVALID_INPUT',
    incidentId: null,
    awarenessAt: null,
    affectedObjectCount: 0,
    recipientStatus: null,
    recipients: [],
    recipientGaps: [],
    decision: null,
    notificationTasks: [],
  };
}

export async function runBreachTabletopExercise(
  input: unknown,
  resolver: BreachRecipientResolver,
): Promise<BreachTabletopResult> {
  if (!isRecord(input) || !hasOnlyKeys(input, INPUT_KEYS)) return invalidResult();
  if (typeof input.incidentId !== 'string' || !INCIDENT_ID_RE.test(input.incidentId)) return invalidResult();

  const awarenessAt = canonicalUtcTimestamp(input.awarenessAt);
  const decision = parseDecision(input.decision);
  if (!awarenessAt || !decision) return invalidResult();
  if (Date.parse(decision.decidedAt) < Date.parse(awarenessAt)) return invalidResult();
  if (!Array.isArray(input.affectedObjects) || input.affectedObjects.length === 0) return invalidResult();

  const enumeration = await enumerateBreachRecipients(input.affectedObjects, resolver);
  if (enumeration.status === 'INVALID_INPUT') return invalidResult();

  const base = {
    version: BREACH_TABLETOP_VERSION,
    mode: BREACH_TABLETOP_MODE,
    incidentId: input.incidentId,
    awarenessAt,
    affectedObjectCount: input.affectedObjects.length,
    recipientStatus: enumeration.status,
    recipients: enumeration.recipients,
    recipientGaps: enumeration.gaps,
    decision,
  } as const;

  if (enumeration.status === 'INCOMPLETE') {
    return {
      ...base,
      status: 'BLOCKED_RECIPIENT_SCOPE',
      notificationTasks: [],
    };
  }

  if (decision.outcome === 'UNRESOLVED') {
    return {
      ...base,
      status: 'BLOCKED_DECISION',
      notificationTasks: [],
    };
  }

  if (decision.outcome === 'DO_NOT_NOTIFY') {
    return {
      ...base,
      status: 'COMPLETE',
      notificationTasks: [],
    };
  }

  if (enumeration.recipients.length === 0) {
    return {
      ...base,
      status: 'BLOCKED_DECISION',
      notificationTasks: [],
    };
  }

  return {
    ...base,
    status: 'COMPLETE',
    notificationTasks: enumeration.recipients.map((personRef) => ({
      personRef,
      delivery: 'SIMULATED_NOT_SENT' as const,
    })),
  };
}
