const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REF_RE = /^[a-zA-Z0-9:._-]{1,128}$/;
const OPAQUE_PERSON_RE = /^(contact|external):[a-zA-Z0-9:._-]{1,112}$/;

export const BREACH_AFFECTED_SURFACES = [
  'user',
  'dog',
  'subscription',
  'achievement',
  'community',
  'community_membership',
  'post',
  'comment',
  'community_event',
  'ai_message',
  'device',
  'health_entry',
  'sensor_summary',
  'eli_state',
  'baseline',
  'copresence_event',
  'contact_request',
  'journal_entry',
  'vet_report_share',
  'external_media_object',
  'external_provider_copy',
  'cache_index_copy',
] as const;
export type BreachAffectedSurface = (typeof BREACH_AFFECTED_SURFACES)[number];

export const BREACH_RECIPIENT_GAP_REASONS = [
  'canonical_subject_missing',
  'third_party_recipient_not_recorded',
  'provider_copy_unverified',
  'resolver_failure',
  'unsupported_surface',
] as const;
export type BreachRecipientGapReason = (typeof BREACH_RECIPIENT_GAP_REASONS)[number];

export interface BreachAffectedObject {
  surface: BreachAffectedSurface;
  ref: string;
}

export type BreachRecipientResolution =
  | {
      status: 'RESOLVED';
      personRefs: readonly string[];
    }
  | {
      status: 'NO_PERSON_REPRESENTED';
    }
  | {
      status: 'UNRESOLVED';
      gap: BreachRecipientGapReason;
    };

export interface BreachRecipientResolver {
  resolveAffectedObject(object: BreachAffectedObject): Promise<unknown>;
}

export interface BreachRecipientGap {
  objectKey: string;
  reason: BreachRecipientGapReason;
}

export type BreachRecipientEnumeration =
  | {
      status: 'INVALID_INPUT';
      recipients: readonly [];
      gaps: readonly [];
    }
  | {
      status: 'COMPLETE' | 'INCOMPLETE';
      recipients: readonly string[];
      gaps: readonly BreachRecipientGap[];
    };

const OBJECT_KEYS = Object.freeze(['surface', 'ref']);
const RESOLVED_KEYS = Object.freeze(['status', 'personRefs']);
const NO_PERSON_KEYS = Object.freeze(['status']);
const UNRESOLVED_KEYS = Object.freeze(['status', 'gap']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function includesString(values: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && values.includes(value);
}

function parseAffectedObject(value: unknown): BreachAffectedObject | null {
  if (!isRecord(value) || !hasOnlyKeys(value, OBJECT_KEYS)) return null;
  if (!includesString(BREACH_AFFECTED_SURFACES, value.surface)) return null;
  if (typeof value.ref !== 'string' || !SAFE_REF_RE.test(value.ref)) return null;
  return {
    surface: value.surface as BreachAffectedSurface,
    ref: value.ref,
  };
}

function parseUnsupportedObject(value: unknown): { surface: string; ref: string } | null {
  if (!isRecord(value) || !hasOnlyKeys(value, OBJECT_KEYS)) return null;
  if (typeof value.surface !== 'string' || value.surface.length === 0) return null;
  if (includesString(BREACH_AFFECTED_SURFACES, value.surface)) return null;
  if (typeof value.ref !== 'string' || !SAFE_REF_RE.test(value.ref)) return null;
  return { surface: value.surface, ref: value.ref };
}

function isSafePersonRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.startsWith('user:')) {
    return UUID_RE.test(value.slice('user:'.length));
  }
  return OPAQUE_PERSON_RE.test(value);
}

function parseResolution(value: unknown): BreachRecipientResolution | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null;

  if (value.status === 'NO_PERSON_REPRESENTED') {
    return hasOnlyKeys(value, NO_PERSON_KEYS)
      ? { status: 'NO_PERSON_REPRESENTED' }
      : null;
  }

  if (value.status === 'UNRESOLVED') {
    if (!hasOnlyKeys(value, UNRESOLVED_KEYS)) return null;
    if (!includesString(BREACH_RECIPIENT_GAP_REASONS, value.gap)) return null;
    return {
      status: 'UNRESOLVED',
      gap: value.gap as BreachRecipientGapReason,
    };
  }

  if (value.status === 'RESOLVED') {
    if (!hasOnlyKeys(value, RESOLVED_KEYS) || !Array.isArray(value.personRefs) || value.personRefs.length === 0) {
      return null;
    }

    const personRefs: string[] = [];
    for (const personRef of value.personRefs) {
      if (!isSafePersonRef(personRef)) return null;
      personRefs.push(personRef);
    }

    return {
      status: 'RESOLVED',
      personRefs,
    };
  }

  return null;
}

function objectKey(object: BreachAffectedObject): string {
  return `${object.surface}:${object.ref}`;
}

export async function enumerateBreachRecipients(
  affectedObjectsInput: readonly unknown[],
  resolver: BreachRecipientResolver,
): Promise<BreachRecipientEnumeration> {
  if (!Array.isArray(affectedObjectsInput) || affectedObjectsInput.length === 0) {
    return { status: 'INVALID_INPUT', recipients: [], gaps: [] };
  }

  const affectedObjects: BreachAffectedObject[] = [];
  const gaps: BreachRecipientGap[] = [];

  for (const input of affectedObjectsInput) {
    const parsed = parseAffectedObject(input);
    if (parsed) {
      affectedObjects.push(parsed);
      continue;
    }

    const unsupported = parseUnsupportedObject(input);
    if (unsupported) {
      gaps.push({
        objectKey: `unsupported:${unsupported.surface}:${unsupported.ref}`,
        reason: 'unsupported_surface',
      });
      continue;
    }

    return { status: 'INVALID_INPUT', recipients: [], gaps: [] };
  }

  affectedObjects.sort((left, right) => objectKey(left).localeCompare(objectKey(right)));

  const recipients = new Set<string>();

  for (const object of affectedObjects) {
    let rawResolution: unknown;
    try {
      rawResolution = await resolver.resolveAffectedObject(object);
    } catch {
      gaps.push({ objectKey: objectKey(object), reason: 'resolver_failure' });
      continue;
    }

    const resolution = parseResolution(rawResolution);
    if (!resolution) {
      gaps.push({ objectKey: objectKey(object), reason: 'resolver_failure' });
      continue;
    }

    if (resolution.status === 'UNRESOLVED') {
      gaps.push({ objectKey: objectKey(object), reason: resolution.gap });
      continue;
    }

    if (resolution.status === 'NO_PERSON_REPRESENTED') continue;

    for (const personRef of resolution.personRefs) recipients.add(personRef);
  }

  const sortedRecipients = [...recipients].sort();
  const sortedGaps = gaps.sort((left, right) => {
    const keyDelta = left.objectKey.localeCompare(right.objectKey);
    return keyDelta !== 0 ? keyDelta : left.reason.localeCompare(right.reason);
  });

  return {
    status: sortedGaps.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
    recipients: sortedRecipients,
    gaps: sortedGaps,
  };
}
