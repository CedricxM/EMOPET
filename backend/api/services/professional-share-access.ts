import {
  ProfessionalShareAccessRecordSchema,
  ProfessionalShareReadIntentSchema,
  type ProfessionalSharePurpose,
  type ProfessionalShareScope,
} from '@emopet/shared';

type Grant = ReturnType<typeof ProfessionalShareAccessRecordSchema.parse>;
type Intent = ReturnType<typeof ProfessionalShareReadIntentSchema.parse>;

type DenialReason =
  | 'INVALID_REQUEST'
  | 'GRANT_NOT_FOUND'
  | 'GRANT_NOT_ACTIVE'
  | 'GRANT_EXPIRED'
  | 'GRANT_REVOKED'
  | 'DOG_SCOPE_MISMATCH'
  | 'RECIPIENT_MISMATCH'
  | 'OWNER_AUTHORITY_MISMATCH'
  | 'PURPOSE_MISMATCH'
  | 'DATA_SCOPE_MISMATCH'
  | 'DATA_WINDOW_MISMATCH';

type UnavailableReason =
  | 'AUTHORITY_NOT_CONFIGURED'
  | 'AUTHORITY_UNAVAILABLE'
  | 'INVALID_STORED_GRANT'
  | 'RECIPIENT_POLICY_NOT_READY'
  | 'SCOPE_POLICY_NOT_READY'
  | 'RESEARCH_CONSENT_NOT_READY'
  | 'AUDIT_UNAVAILABLE';

export type ProfessionalShareReadDecision =
  | { allowed: false; status: 'DENIED'; reason: DenialReason }
  | { allowed: false; status: 'UNAVAILABLE'; reason: UnavailableReason }
  | {
      allowed: true;
      status: 'AUTHORIZED';
      reason: 'ACTIVE_GRANT';
      grantId: string;
      dogId: string;
      purpose: ProfessionalSharePurpose;
      scopes: ProfessionalShareScope[];
      dataFrom: string;
      dataTo: string;
      accessExpiresAt: string;
    };

export interface ProfessionalShareAccessAudit {
  event: 'PROFESSIONAL_SHARE_POLICY_DECISION';
  grantId: string;
  dogId: string;
  status: ProfessionalShareReadDecision['status'];
  reason: ProfessionalShareReadDecision['reason'];
}

/**
 * Server adapters only. None is wired to a production route yet (#64).
 * readGrant must load current durable state on every call. A recipient ID must
 * come from verified server identity, never a request body or an email label.
 * recordDecision must acknowledge a durable, sanitized audit write with true.
 */
export interface ProfessionalShareAccessAuthority {
  readGrant(grantId: string, dogId: string): Promise<unknown>;
  resolveVerifiedRecipient(): Promise<{ principalId: string } | null>;
  hasCurrentOwnerAuthority(ownerUserId: string, dogId: string): Promise<boolean>;
  recordDecision(event: ProfessionalShareAccessAudit): Promise<boolean>;
}

const deny = (reason: DenialReason): ProfessionalShareReadDecision => ({
  allowed: false, status: 'DENIED', reason,
});
const unavailable = (reason: UnavailableReason): ProfessionalShareReadDecision => ({
  allowed: false, status: 'UNAVAILABLE', reason,
});

function evaluateGrant(grant: Grant, intent: Intent, now: number): ProfessionalShareReadDecision {
  if (!Number.isFinite(now)) return unavailable('AUTHORITY_UNAVAILABLE');
  if (grant.id !== intent.grantId) return deny('GRANT_NOT_FOUND');
  if (grant.dogId !== intent.dogId) return deny('DOG_SCOPE_MISMATCH');
  if (grant.revokedAt || grant.status === 'REVOKED') return deny('GRANT_REVOKED');
  if (grant.status === 'EXPIRED' || Date.parse(grant.window.accessExpiresAt) <= now) {
    return deny('GRANT_EXPIRED');
  }
  if (grant.status !== 'ACTIVE') return deny('GRANT_NOT_ACTIVE');
  if (!grant.activatedAt || Date.parse(grant.activatedAt) > now ||
      Date.parse(grant.activatedAt) < Date.parse(grant.createdAt)) {
    return unavailable('INVALID_STORED_GRANT');
  }
  if (grant.purpose !== intent.purpose) return deny('PURPOSE_MISMATCH');
  if (!intent.scopes.every((scope) => grant.scopes.includes(scope))) return deny('DATA_SCOPE_MISMATCH');
  if (Date.parse(intent.dataFrom) < Date.parse(grant.window.dataFrom) ||
      Date.parse(intent.dataTo) > Date.parse(grant.window.dataTo)) {
    return deny('DATA_WINDOW_MISMATCH');
  }
  // These decisions are still OPEN in the controlled backend plan. A valid
  // schema cannot stand in for research consent or note/context selection.
  if (grant.purpose === 'RESEARCH_WITH_SEPARATE_CONSENT') return unavailable('RESEARCH_CONSENT_NOT_READY');
  if (intent.scopes.some((scope) => scope === 'OWNER_SELECTED_NOTES' || scope === 'DECLARED_CONTEXT')) {
    return unavailable('SCOPE_POLICY_NOT_READY');
  }
  return {
    allowed: true, status: 'AUTHORIZED', reason: 'ACTIVE_GRANT',
    grantId: grant.id, dogId: grant.dogId, purpose: grant.purpose,
    scopes: [...intent.scopes], dataFrom: intent.dataFrom, dataTo: intent.dataTo,
    accessExpiresAt: grant.window.accessExpiresAt,
  };
}

/**
 * Access-policy skeleton, not a sharing endpoint or a reusable bearer grant.
 * There is no default store, identity provider, email fallback or audit sink.
 * A future report service must apply the returned projection inside its
 * controlled read/authorization transaction; this module never returns data.
 */
export function createProfessionalShareAccessChecker(
  authority?: ProfessionalShareAccessAuthority,
  clock: () => number = Date.now,
) {
  return async function check(rawIntent: unknown): Promise<ProfessionalShareReadDecision> {
    const parsed = ProfessionalShareReadIntentSchema.safeParse(rawIntent);
    if (!parsed.success) return deny('INVALID_REQUEST');
    const intent = parsed.data;
    if (!authority) return unavailable('AUTHORITY_NOT_CONFIGURED');

    async function audited(decision: ProfessionalShareReadDecision): Promise<ProfessionalShareReadDecision> {
      try {
        const written = await authority!.recordDecision({
          event: 'PROFESSIONAL_SHARE_POLICY_DECISION',
          grantId: intent.grantId, dogId: intent.dogId,
          status: decision.status, reason: decision.reason,
        });
        return written === true ? decision : unavailable('AUDIT_UNAVAILABLE');
      } catch {
        return unavailable('AUDIT_UNAVAILABLE');
      }
    }

    try {
      const recipient = await authority.resolveVerifiedRecipient();
      if (!recipient || typeof recipient.principalId !== 'string' || !recipient.principalId.trim()) {
        return audited(deny('RECIPIENT_MISMATCH'));
      }
      const rawGrant = await authority.readGrant(intent.grantId, intent.dogId);
      if (rawGrant == null) return audited(deny('GRANT_NOT_FOUND'));
      const stored = ProfessionalShareAccessRecordSchema.safeParse(rawGrant);
      if (!stored.success) return audited(unavailable('INVALID_STORED_GRANT'));
      const grant = stored.data;
      if (grant.id !== intent.grantId) return audited(deny('GRANT_NOT_FOUND'));
      if (grant.dogId !== intent.dogId) return audited(deny('DOG_SCOPE_MISMATCH'));
      if (!grant.recipient.principalId?.trim()) return audited(unavailable('RECIPIENT_POLICY_NOT_READY'));
      if (grant.recipient.principalId !== recipient.principalId) return audited(deny('RECIPIENT_MISMATCH'));
      if (await authority.hasCurrentOwnerAuthority(grant.ownerUserId, grant.dogId) !== true) {
        return audited(deny('OWNER_AUTHORITY_MISMATCH'));
      }
      const decision = await audited(evaluateGrant(grant, intent, clock()));
      // A slow audit must not authorize access after the grant expires.
      if (decision.allowed) {
        const afterAudit = evaluateGrant(grant, intent, clock());
        if (!afterAudit.allowed) return audited(afterAudit);
      }
      return decision;
    } catch {
      return audited(unavailable('AUTHORITY_UNAVAILABLE'));
    }
  };
}
