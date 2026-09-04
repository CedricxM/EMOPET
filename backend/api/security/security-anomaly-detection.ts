import {
  parseSecurityAuditEvent,
  type SecurityAuditEvent,
} from './security-audit-event.js';

export interface SecurityDetectionPolicy {
  repeatedDenials: {
    enabled: boolean;
    threshold: number;
    windowSeconds: number;
  };
  rapidMultiTargetAccess: {
    enabled: boolean;
    uniqueTargetThreshold: number;
    windowSeconds: number;
  };
  machinePrivilegedAttempts: {
    enabled: boolean;
  };
}

export type SecurityDetection =
  | {
      type: 'repeated_privileged_denials';
      actorKey: string;
      windowStart: string;
      windowEnd: string;
      count: number;
    }
  | {
      type: 'rapid_multi_target_access';
      actorKey: string;
      windowStart: string;
      windowEnd: string;
      uniqueTargetCount: number;
    }
  | {
      type: 'machine_privileged_authority_attempt';
      actorKey: string;
      occurredAt: string;
    };

export type SecurityDetectionEvaluation =
  | {
      status: 'INVALID_POLICY';
      detections: readonly [];
    }
  | {
      status: 'EVALUATED';
      detections: readonly SecurityDetection[];
    };

const POLICY_KEYS = Object.freeze([
  'repeatedDenials',
  'rapidMultiTargetAccess',
  'machinePrivilegedAttempts',
]);
const REPEATED_DENIAL_KEYS = Object.freeze(['enabled', 'threshold', 'windowSeconds']);
const RAPID_ACCESS_KEYS = Object.freeze(['enabled', 'uniqueTargetThreshold', 'windowSeconds']);
const MACHINE_ATTEMPT_KEYS = Object.freeze(['enabled']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isSafeWindowSeconds(value: unknown): value is number {
  return isSafePositiveInteger(value) && value <= Math.floor(Number.MAX_SAFE_INTEGER / 1000);
}

function parsePolicy(value: unknown): SecurityDetectionPolicy | null {
  if (!isRecord(value) || !hasOnlyKeys(value, POLICY_KEYS)) return null;

  const repeated = value.repeatedDenials;
  const rapid = value.rapidMultiTargetAccess;
  const machine = value.machinePrivilegedAttempts;

  if (!isRecord(repeated) || !hasOnlyKeys(repeated, REPEATED_DENIAL_KEYS)) return null;
  if (!isRecord(rapid) || !hasOnlyKeys(rapid, RAPID_ACCESS_KEYS)) return null;
  if (!isRecord(machine) || !hasOnlyKeys(machine, MACHINE_ATTEMPT_KEYS)) return null;

  if (
    typeof repeated.enabled !== 'boolean'
    || !isSafePositiveInteger(repeated.threshold)
    || !isSafeWindowSeconds(repeated.windowSeconds)
  ) {
    return null;
  }

  if (
    typeof rapid.enabled !== 'boolean'
    || !isSafePositiveInteger(rapid.uniqueTargetThreshold)
    || !isSafeWindowSeconds(rapid.windowSeconds)
  ) {
    return null;
  }

  if (typeof machine.enabled !== 'boolean') return null;

  return {
    repeatedDenials: {
      enabled: repeated.enabled,
      threshold: repeated.threshold,
      windowSeconds: repeated.windowSeconds,
    },
    rapidMultiTargetAccess: {
      enabled: rapid.enabled,
      uniqueTargetThreshold: rapid.uniqueTargetThreshold,
      windowSeconds: rapid.windowSeconds,
    },
    machinePrivilegedAttempts: {
      enabled: machine.enabled,
    },
  };
}

function actorKey(event: SecurityAuditEvent): string | null {
  if (event.actor.kind === 'anonymous') return null;
  return `${event.actor.kind}:${event.actor.subject}`;
}

function eventTime(event: SecurityAuditEvent): number {
  return Date.parse(event.occurredAt);
}

function canonicalEvents(values: readonly unknown[]): SecurityAuditEvent[] {
  const events: SecurityAuditEvent[] = [];
  for (const value of values) {
    const event = parseSecurityAuditEvent(value);
    if (event) events.push(event);
  }
  return events.sort((left, right) => {
    const timeDelta = eventTime(left) - eventTime(right);
    if (timeDelta !== 0) return timeDelta;
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

function detectRepeatedDenials(
  events: readonly SecurityAuditEvent[],
  policy: SecurityDetectionPolicy['repeatedDenials'],
): SecurityDetection[] {
  if (!policy.enabled) return [];

  const grouped = new Map<string, SecurityAuditEvent[]>();
  for (const event of events) {
    if (event.eventType !== 'privileged_authority_decision' || event.outcome !== 'denied') continue;
    const key = actorKey(event);
    if (!key) continue;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  const detections: SecurityDetection[] = [];
  const windowMs = policy.windowSeconds * 1000;

  for (const key of [...grouped.keys()].sort()) {
    const bucket = grouped.get(key) ?? [];
    let emitted = false;

    for (let start = 0; start < bucket.length && !emitted; start += 1) {
      const first = bucket[start];
      if (!first) continue;
      const startMs = eventTime(first);
      let count = 0;
      let last = first;

      for (let index = start; index < bucket.length; index += 1) {
        const current = bucket[index];
        if (!current) continue;
        if (eventTime(current) - startMs > windowMs) break;
        count += 1;
        last = current;
        if (count >= policy.threshold) {
          detections.push({
            type: 'repeated_privileged_denials',
            actorKey: key,
            windowStart: first.occurredAt,
            windowEnd: last.occurredAt,
            count,
          });
          emitted = true;
          break;
        }
      }
    }
  }

  return detections;
}

function detectRapidMultiTargetAccess(
  events: readonly SecurityAuditEvent[],
  policy: SecurityDetectionPolicy['rapidMultiTargetAccess'],
): SecurityDetection[] {
  if (!policy.enabled) return [];

  const grouped = new Map<string, SecurityAuditEvent[]>();
  for (const event of events) {
    if (
      event.eventType !== 'privileged_sensitive_access'
      || event.outcome !== 'allowed'
      || event.actor.kind !== 'privileged_human'
      || event.target.ref === null
    ) {
      continue;
    }

    const key = actorKey(event);
    if (!key) continue;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  const detections: SecurityDetection[] = [];
  const windowMs = policy.windowSeconds * 1000;

  for (const key of [...grouped.keys()].sort()) {
    const bucket = grouped.get(key) ?? [];
    let emitted = false;

    for (let start = 0; start < bucket.length && !emitted; start += 1) {
      const first = bucket[start];
      if (!first) continue;
      const startMs = eventTime(first);
      const targets = new Set<string>();
      let last = first;

      for (let index = start; index < bucket.length; index += 1) {
        const current = bucket[index];
        if (!current) continue;
        if (eventTime(current) - startMs > windowMs) break;
        if (current.target.ref) targets.add(`${current.target.scope}:${current.target.ref}`);
        last = current;

        if (targets.size >= policy.uniqueTargetThreshold) {
          detections.push({
            type: 'rapid_multi_target_access',
            actorKey: key,
            windowStart: first.occurredAt,
            windowEnd: last.occurredAt,
            uniqueTargetCount: targets.size,
          });
          emitted = true;
          break;
        }
      }
    }
  }

  return detections;
}

function detectMachinePrivilegedAttempts(
  events: readonly SecurityAuditEvent[],
  policy: SecurityDetectionPolicy['machinePrivilegedAttempts'],
): SecurityDetection[] {
  if (!policy.enabled) return [];

  return events
    .filter((event) => (
      event.eventType === 'privileged_authority_decision'
      && event.actor.kind === 'machine'
      && event.outcome === 'denied'
      && event.reason === 'machine_principal_not_supported'
    ))
    .map((event) => ({
      type: 'machine_privileged_authority_attempt' as const,
      actorKey: `${event.actor.kind}:${event.actor.subject}`,
      occurredAt: event.occurredAt,
    }));
}

export function evaluateSecurityAnomalies(
  values: readonly unknown[],
  policyInput: unknown,
): SecurityDetectionEvaluation {
  const policy = parsePolicy(policyInput);
  if (!policy) return { status: 'INVALID_POLICY', detections: [] };

  const events = canonicalEvents(values);
  const detections = [
    ...detectRepeatedDenials(events, policy.repeatedDenials),
    ...detectRapidMultiTargetAccess(events, policy.rapidMultiTargetAccess),
    ...detectMachinePrivilegedAttempts(events, policy.machinePrivilegedAttempts),
  ].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  return { status: 'EVALUATED', detections };
}
