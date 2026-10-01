/**
 * Bretagne canine pilot candidate-register evidence guard.
 *
 * The candidate register is intentionally weaker than a partnership register.
 * Public organisational evidence may prove that a club exists and is active;
 * it cannot prove willingness, endorsement, recruitment permission or data
 * rights.
 */

export const BRETAGNE_CANINE_PILOT_SCHEMA =
  'emopet-bretagne-canine-pilot-candidates-v1' as const;

export const BRETAGNE_CANINE_RELATIONSHIP_STATUSES = [
  'CANDIDATE_NOT_CONTACTED',
  'OUTREACH_SENT',
  'RESPONSE_RECEIVED',
  'PILOT_SCOPE_DISCUSSION',
  'LETTER_OF_INTEREST_RECEIVED',
  'DECLINED',
  'DEFERRED',
] as const;

export type BretagneCanineRelationshipStatus =
  (typeof BRETAGNE_CANINE_RELATIONSHIP_STATUSES)[number];

export interface BretagneCanineRelationshipEvidence {
  outreachSentAt?: string;
  outreachEvidenceRef?: string;
  responseReceivedAt?: string;
  responseEvidenceRef?: string;
  pilotScopeEvidenceRef?: string;
  letterOfInterestEvidenceRef?: string;
  dispositionNote?: string;
}

export interface BretagneCaninePilotCandidate {
  candidateId: string;
  organisationName: string;
  territory: string;
  relationshipStatus: BretagneCanineRelationshipStatus;
  publicActivityEvidence: {
    reviewedAt: string;
    summary: string;
  };
  potentialRoles: readonly string[];
  publicSources: readonly string[];
  partnershipClaimAllowed: false;
  contactDataStored: false;
  notes: string;
  relationshipEvidence?: BretagneCanineRelationshipEvidence;
}

export interface BretagneCaninePilotRegistry {
  schemaVersion: typeof BRETAGNE_CANINE_PILOT_SCHEMA;
  controlledAt: string;
  purpose: string;
  allowedStatuses: readonly BretagneCanineRelationshipStatus[];
  candidates: readonly BretagneCaninePilotCandidate[];
  promotionRules: Record<string, string>;
}

const FORBIDDEN_PERSONAL_CONTACT_KEYS = new Set([
  'email',
  'phone',
  'telephone',
  'contactemail',
  'contactphone',
  'contactname',
  'personalcontact',
  'contactdetails',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validIsoDateOrDateTime(value: unknown): boolean {
  if (!nonEmptyString(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isSafePublicUrl(value: unknown): boolean {
  if (!nonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

function collectForbiddenContactKeys(
  value: unknown,
  path = 'candidate',
  out: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenContactKeys(item, path + '[' + index + ']', out),
    );
    return out;
  }
  if (!isRecord(value)) return out;

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_PERSONAL_CONTACT_KEYS.has(key.toLowerCase())) {
      out.push(path + '.' + key);
    }
    collectForbiddenContactKeys(nested, path + '.' + key, out);
  }
  return out;
}

function requireRelationshipEvidence(
  candidate: BretagneCaninePilotCandidate,
): string[] {
  const errors: string[] = [];
  const evidence = candidate.relationshipEvidence;
  const id = candidate.candidateId;

  const requireOutreach = () => {
    if (!evidence || !validIsoDateOrDateTime(evidence.outreachSentAt)) {
      errors.push(id + ': outreachSentAt evidence required');
    }
    if (!evidence || !nonEmptyString(evidence.outreachEvidenceRef)) {
      errors.push(id + ': outreachEvidenceRef required');
    }
  };

  const requireResponse = () => {
    requireOutreach();
    if (!evidence || !validIsoDateOrDateTime(evidence.responseReceivedAt)) {
      errors.push(id + ': responseReceivedAt evidence required');
    }
    if (!evidence || !nonEmptyString(evidence.responseEvidenceRef)) {
      errors.push(id + ': responseEvidenceRef required');
    }
  };

  switch (candidate.relationshipStatus) {
    case 'CANDIDATE_NOT_CONTACTED':
      break;
    case 'OUTREACH_SENT':
      requireOutreach();
      break;
    case 'RESPONSE_RECEIVED':
      requireResponse();
      break;
    case 'PILOT_SCOPE_DISCUSSION':
      requireResponse();
      if (!evidence || !nonEmptyString(evidence.pilotScopeEvidenceRef)) {
        errors.push(id + ': pilotScopeEvidenceRef required');
      }
      break;
    case 'LETTER_OF_INTEREST_RECEIVED':
      requireResponse();
      if (!evidence || !nonEmptyString(evidence.letterOfInterestEvidenceRef)) {
        errors.push(id + ': letterOfInterestEvidenceRef required');
      }
      break;
    case 'DECLINED':
    case 'DEFERRED':
      if (!evidence || !nonEmptyString(evidence.dispositionNote)) {
        errors.push(id + ': dispositionNote required');
      }
      break;
  }

  return errors;
}

export function validateBretagneCaninePilotRegistry(
  value: unknown,
): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) return ['registry must be an object'];
  if (value.schemaVersion !== BRETAGNE_CANINE_PILOT_SCHEMA) {
    errors.push('schemaVersion mismatch');
  }
  if (!validIsoDateOrDateTime(value.controlledAt)) {
    errors.push('controlledAt must be a valid date');
  }
  if (!nonEmptyString(value.purpose)) {
    errors.push('purpose is required');
  }

  const expectedStatuses = new Set(BRETAGNE_CANINE_RELATIONSHIP_STATUSES);
  if (!Array.isArray(value.allowedStatuses)) {
    errors.push('allowedStatuses must be an array');
  } else {
    const actual = new Set(value.allowedStatuses);
    for (const status of expectedStatuses) {
      if (!actual.has(status)) errors.push('allowedStatuses missing ' + status);
    }
    for (const status of actual) {
      if (!expectedStatuses.has(status as BretagneCanineRelationshipStatus)) {
        errors.push('allowedStatuses contains unknown status ' + String(status));
      }
    }
  }

  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    errors.push('candidates must be a non-empty array');
    return errors;
  }

  const seenIds = new Set<string>();
  for (const rawCandidate of value.candidates) {
    if (!isRecord(rawCandidate)) {
      errors.push('candidate must be an object');
      continue;
    }

    const id = nonEmptyString(rawCandidate.candidateId)
      ? rawCandidate.candidateId.trim()
      : '<missing-id>';

    if (id === '<missing-id>') errors.push('candidateId is required');
    if (seenIds.has(id)) errors.push(id + ': duplicate candidateId');
    seenIds.add(id);

    if (!nonEmptyString(rawCandidate.organisationName)) {
      errors.push(id + ': organisationName is required');
    }
    if (!nonEmptyString(rawCandidate.territory)) {
      errors.push(id + ': territory is required');
    }

    if (
      !BRETAGNE_CANINE_RELATIONSHIP_STATUSES.includes(
        rawCandidate.relationshipStatus as BretagneCanineRelationshipStatus,
      )
    ) {
      errors.push(id + ': invalid relationshipStatus');
      continue;
    }

    if (rawCandidate.partnershipClaimAllowed !== false) {
      errors.push(id + ': partnershipClaimAllowed must stay false');
    }
    if (rawCandidate.contactDataStored !== false) {
      errors.push(id + ': contactDataStored must stay false');
    }

    if (!Array.isArray(rawCandidate.potentialRoles) ||
        rawCandidate.potentialRoles.length === 0 ||
        rawCandidate.potentialRoles.some((role) => !nonEmptyString(role))) {
      errors.push(id + ': potentialRoles must be non-empty strings');
    }

    if (!Array.isArray(rawCandidate.publicSources) ||
        rawCandidate.publicSources.length === 0 ||
        rawCandidate.publicSources.some((url) => !isSafePublicUrl(url))) {
      errors.push(id + ': publicSources must contain safe HTTPS URLs');
    }

    const activity = rawCandidate.publicActivityEvidence;
    if (!isRecord(activity) ||
        !validIsoDateOrDateTime(activity.reviewedAt) ||
        !nonEmptyString(activity.summary)) {
      errors.push(id + ': publicActivityEvidence is incomplete');
    }

    if (!nonEmptyString(rawCandidate.notes)) {
      errors.push(id + ': notes are required');
    }

    const forbiddenKeys = collectForbiddenContactKeys(rawCandidate, id);
    for (const forbidden of forbiddenKeys) {
      errors.push(forbidden + ': personal contact field forbidden');
    }

    errors.push(
      ...requireRelationshipEvidence(
        rawCandidate as unknown as BretagneCaninePilotCandidate,
      ),
    );
  }

  if (!isRecord(value.promotionRules)) {
    errors.push('promotionRules must be an object');
  } else {
    for (const key of [
      'outreachSentRequires',
      'responseReceivedRequires',
      'pilotScopeDiscussionRequires',
      'letterOfInterestReceivedRequires',
      'partnershipTerminology',
    ]) {
      if (!nonEmptyString(value.promotionRules[key])) {
        errors.push('promotionRules.' + key + ' is required');
      }
    }
  }

  return errors;
}
