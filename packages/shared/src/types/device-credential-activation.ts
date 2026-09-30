/**
 * Device Trust activation evidence/receipt data contracts.
 *
 * These shapes do not authorize activation. A future M6 service must resolve
 * every evidence reference server-side from controlled stores and must never
 * accept caller-supplied "passed" booleans as authority.
 */

export interface DeviceCredentialActivationEvidenceRefsV1 {
  schemaVersion: 'device-credential-activation-evidence-refs-v1';
  protocolVersion: 1;

  deviceId: string;
  pendingCredentialVersion: number;

  /**
   * Fresh PoP evidence already verified and consumed by server authority.
   * The activation service must load/verify the referenced record itself.
   */
  popVerificationReceiptId: string;
  popChallengeId: string;

  /**
   * Final manufacturing/debug-state evidence after the production debug
   * transition. This is a server-side receipt reference, not a boolean.
   */
  debugStateReceiptId: string;

  /**
   * Evidence that the proof/debug flow ran on the representative production
   * target family required by #648/#657.
   */
  targetEvidenceReceiptId: string;

  firmwareVersion: string;
  hardwareRevision: string;
  bootstrapRevision: string;

  /**
   * Null for first activation. Required for a rotation cutover.
   */
  predecessorCredentialVersion: number | null;

  authority: 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY';
  recordedAt: string;
}

export interface DeviceCredentialActivationReceiptV1 {
  schemaVersion: 'device-credential-activation-receipt-v1';
  protocolVersion: 1;

  activationId: string;
  deviceId: string;
  credentialVersion: number;
  predecessorCredentialVersion: number | null;
  cutoverType: 'INITIAL' | 'ROTATION';

  evidenceRefs: DeviceCredentialActivationEvidenceRefsV1;

  resultingCredentialState: 'ACTIVE';
  predecessorResultingState: 'NONE' | 'REVOKED_PENDING_ERASE';

  activatedAt: string;

  /**
   * Credential activation is not Device Data Trust and does not by itself
   * authorize telemetry persistence.
   */
  deviceDataTrustAuthorized: false;
  networkTelemetryPersistenceAuthorized: false;
}
