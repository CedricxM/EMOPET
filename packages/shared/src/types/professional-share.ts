export type ProfessionalShareRecipientType =
  | 'VETERINARIAN'
  | 'VETERINARY_CLINIC'
  | 'RESEARCHER'
  | 'OTHER_PROFESSIONAL';

export type ProfessionalSharePurpose =
  | 'VETERINARY_CONSULTATION'
  | 'FOLLOW_UP'
  | 'SECOND_OPINION'
  | 'RESEARCH_WITH_SEPARATE_CONSENT'
  | 'OTHER_DECLARED_PURPOSE';

/**
 * Scopes are deliberately semantic. Raw sensor streams and private social/
 * Memories content are not professional-share defaults.
 */
export type ProfessionalShareScope =
  | 'VETERINARY_SUMMARY'
  | 'OWNER_SELECTED_NOTES'
  | 'QUALIFIED_LONGITUDINAL_OBSERVATIONS'
  | 'DATA_COVERAGE_AND_CONFIDENCE'
  | 'DECLARED_CONTEXT';

export type ProfessionalShareGrantStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUSPENDED';

export interface ProfessionalShareRecipient {
  /** Human-readable recipient identity recorded by the Guardian. */
  displayName: string;
  type: ProfessionalShareRecipientType;
  /** Optional clinic/institution context. */
  organizationName?: string;
  /** Recipient-bound delivery address where used. Never a proof of professional status. */
  email?: string;
  /** Optional EMOPET professional principal once verified/implemented. */
  principalId?: string;
}

export interface ProfessionalShareWindow {
  /** Inclusive observation period requested by the Guardian. */
  dataFrom: string;
  dataTo: string;
  /** Access expiry is independent from the data period. */
  accessExpiresAt: string;
}

/**
 * Durable professional-share authority candidate.
 *
 * The backend, not the client, must ultimately decide whether a grant is effective.
 */
export interface ProfessionalShareGrant {
  id: string;
  guardianUserId: string;
  dogId: string;
  recipient: ProfessionalShareRecipient;
  purpose: ProfessionalSharePurpose;
  purposeNote?: string;
  scopes: ProfessionalShareScope[];
  window: ProfessionalShareWindow;
  status: ProfessionalShareGrantStatus;
  createdAt: string;
  activatedAt?: string;
  revokedAt?: string;
  revokedByUserId?: string;
  revocationReason?: string;
  /** Opaque server-side token identifier. Never store bearer token plaintext here. */
  tokenId?: string;
}

export type ProfessionalShareAuditAction =
  | 'GRANT_CREATED'
  | 'GRANT_ACTIVATED'
  | 'LINK_ISSUED'
  | 'ACCESS_SUCCEEDED'
  | 'ACCESS_DENIED'
  | 'GRANT_REVOKED'
  | 'GRANT_EXPIRED';

export interface ProfessionalShareAuditEvent {
  id: string;
  grantId: string;
  dogId: string;
  action: ProfessionalShareAuditAction;
  occurredAt: string;
  actorType: 'GUARDIAN' | 'RECIPIENT' | 'SYSTEM';
  actorId?: string;
  /** Coarse reason/status only. Never log report contents or bearer tokens. */
  reason?: string;
}

export interface ProfessionalShareAccessDecision {
  allowed: boolean;
  grantId?: string;
  reason:
    | 'ACTIVE_GRANT'
    | 'GRANT_NOT_FOUND'
    | 'GRANT_NOT_ACTIVE'
    | 'GRANT_EXPIRED'
    | 'GRANT_REVOKED'
    | 'DOG_SCOPE_MISMATCH'
    | 'RECIPIENT_MISMATCH'
    | 'DATA_SCOPE_MISMATCH';
}
