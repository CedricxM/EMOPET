import { randomUUID } from 'node:crypto';

import {
  DeviceCredentialActivationEvidenceRefsV1Schema,
  DeviceCredentialActivationReceiptV1Schema,
  type DeviceCredentialActivationEvidenceRefsV1,
  type DeviceCredentialActivationReceiptV1,
} from '@emopet/shared';

export interface PendingCredentialForActivationV1 {
  deviceId: string;
  credentialVersion: number;
  state: 'PENDING_PROOF';
  firmwareVersion: string;
  hardwareRevision: string;
  bootstrapRevision: string;
}

export interface PendingCredentialForActivationResolver {
  resolvePendingCredential(
    deviceId: string,
    credentialVersion: number,
  ): Promise<PendingCredentialForActivationV1 | null>;
}

export interface PopVerificationEvidenceRecordV1 {
  receiptId: string;
  authority: 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY';
  deviceId: string;
  credentialVersion: number;
  challengeId: string;
  verificationResult: 'VERIFIED_AND_CONSUMED';
  verifiedAt: string;
  consumedAt: string;
}

export interface PopVerificationEvidenceStore {
  findByReceiptId(
    receiptId: string,
  ): Promise<PopVerificationEvidenceRecordV1 | null>;
}

export interface DebugStateEvidenceRecordV1 {
  receiptId: string;
  authority: 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY';
  deviceId: string;
  credentialVersion: number;
  debugStateResult: 'APPROTECT_PRODUCTION_POLICY_VERIFIED';
  firmwareVersion: string;
  hardwareRevision: string;
  bootstrapRevision: string;
  recordedAt: string;
}

export interface DebugStateEvidenceStore {
  findByReceiptId(
    receiptId: string,
  ): Promise<DebugStateEvidenceRecordV1 | null>;
}

export interface TargetEvidenceRecordV1 {
  receiptId: string;
  authority: 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY';
  deviceId: string;
  credentialVersion: number;
  targetResult: 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED';
  firmwareVersion: string;
  hardwareRevision: string;
  bootstrapRevision: string;
  recordedAt: string;
}

export interface TargetEvidenceStore {
  findByReceiptId(
    receiptId: string,
  ): Promise<TargetEvidenceRecordV1 | null>;
}

export interface DeviceCredentialActivationEvidenceResolverDependencies {
  pendingCredentials: PendingCredentialForActivationResolver;
  popProofs: PopVerificationEvidenceStore;
  debugStates: DebugStateEvidenceStore;
  targetEvidence: TargetEvidenceStore;
  now?: () => Date;
  randomUuid?: () => string;
}

export type DeviceCredentialActivationEvidenceResolveError =
  | 'INVALID_EVIDENCE_REFS'
  | 'PENDING_CREDENTIAL_NOT_FOUND'
  | 'POP_VERIFICATION_RECEIPT_NOT_FOUND'
  | 'DEBUG_STATE_RECEIPT_NOT_FOUND'
  | 'TARGET_EVIDENCE_RECEIPT_NOT_FOUND'
  | 'POP_EVIDENCE_MISMATCH'
  | 'DEBUG_EVIDENCE_MISMATCH'
  | 'TARGET_EVIDENCE_MISMATCH'
  | 'PROVENANCE_MISMATCH'
  | 'EVIDENCE_TIME_INVALID'
  | 'EVIDENCE_STORE_FAILURE'
  | 'RECEIPT_CONSTRUCTION_FAILED';

export type DeviceCredentialActivationEvidenceResolveResult =
  | {
      ok: true;
      receipt: DeviceCredentialActivationReceiptV1;
    }
  | {
      ok: false;
      error: DeviceCredentialActivationEvidenceResolveError;
      issues?: string[];
    };

function sameProvenance(
  pending: PendingCredentialForActivationV1,
  firmwareVersion: string,
  hardwareRevision: string,
  bootstrapRevision: string,
): boolean {
  return (
    pending.firmwareVersion === firmwareVersion
    && pending.hardwareRevision === hardwareRevision
    && pending.bootstrapRevision === bootstrapRevision
  );
}

function parseIso(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function latestIso(values: string[], now: Date): string | null {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return null;

  let latest = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const ms = parseIso(value);
    if (ms == null || ms > nowMs) return null;
    latest = Math.max(latest, ms);
  }

  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}

/**
 * Source-level #771 resolver.
 *
 * The input contains references only. Verdicts are loaded from injected,
 * server-side authorities. This module intentionally provides:
 * - no default evidence store;
 * - no HTTP route;
 * - no Device Data Trust authorization;
 * - no telemetry-persistence authorization;
 * - no hardware-evidence creation path.
 */
export async function resolveDeviceCredentialActivationEvidenceV1(
  rawEvidenceRefs: unknown,
  dependencies: DeviceCredentialActivationEvidenceResolverDependencies,
): Promise<DeviceCredentialActivationEvidenceResolveResult> {
  const parsed = DeviceCredentialActivationEvidenceRefsV1Schema.safeParse(
    rawEvidenceRefs,
  );
  if (!parsed.success) {
    return {
      ok: false,
      error: 'INVALID_EVIDENCE_REFS',
      issues: parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }
  const requested = parsed.data;

  let pending: PendingCredentialForActivationV1 | null;
  let pop: PopVerificationEvidenceRecordV1 | null;
  let debug: DebugStateEvidenceRecordV1 | null;
  let target: TargetEvidenceRecordV1 | null;

  try {
    [pending, pop, debug, target] = await Promise.all([
      dependencies.pendingCredentials.resolvePendingCredential(
        requested.deviceId,
        requested.pendingCredentialVersion,
      ),
      dependencies.popProofs.findByReceiptId(
        requested.popVerificationReceiptId,
      ),
      dependencies.debugStates.findByReceiptId(
        requested.debugStateReceiptId,
      ),
      dependencies.targetEvidence.findByReceiptId(
        requested.targetEvidenceReceiptId,
      ),
    ]);
  } catch {
    return { ok: false, error: 'EVIDENCE_STORE_FAILURE' };
  }

  if (
    pending == null
    || pending.state !== 'PENDING_PROOF'
    || pending.deviceId !== requested.deviceId
    || pending.credentialVersion !== requested.pendingCredentialVersion
  ) {
    return { ok: false, error: 'PENDING_CREDENTIAL_NOT_FOUND' };
  }
  if (pop == null) {
    return { ok: false, error: 'POP_VERIFICATION_RECEIPT_NOT_FOUND' };
  }
  if (debug == null) {
    return { ok: false, error: 'DEBUG_STATE_RECEIPT_NOT_FOUND' };
  }
  if (target == null) {
    return { ok: false, error: 'TARGET_EVIDENCE_RECEIPT_NOT_FOUND' };
  }

  if (
    pop.receiptId !== requested.popVerificationReceiptId
    || pop.authority !== 'SERVER_SIDE_POP_VERIFICATION_AUTHORITY'
    || pop.deviceId !== requested.deviceId
    || pop.credentialVersion !== requested.pendingCredentialVersion
    || pop.challengeId !== requested.popChallengeId
    || pop.verificationResult !== 'VERIFIED_AND_CONSUMED'
  ) {
    return { ok: false, error: 'POP_EVIDENCE_MISMATCH' };
  }

  if (
    debug.receiptId !== requested.debugStateReceiptId
    || debug.authority !== 'SERVER_SIDE_PRODUCTION_DEBUG_AUTHORITY'
    || debug.deviceId !== requested.deviceId
    || debug.credentialVersion !== requested.pendingCredentialVersion
    || debug.debugStateResult !== 'APPROTECT_PRODUCTION_POLICY_VERIFIED'
  ) {
    return { ok: false, error: 'DEBUG_EVIDENCE_MISMATCH' };
  }

  if (
    target.receiptId !== requested.targetEvidenceReceiptId
    || target.authority !== 'SERVER_SIDE_TARGET_EVIDENCE_AUTHORITY'
    || target.deviceId !== requested.deviceId
    || target.credentialVersion !== requested.pendingCredentialVersion
    || target.targetResult !== 'REPRESENTATIVE_MS88SF3_NRF52840_VERIFIED'
  ) {
    return { ok: false, error: 'TARGET_EVIDENCE_MISMATCH' };
  }

  if (
    !sameProvenance(
      pending,
      requested.firmwareVersion,
      requested.hardwareRevision,
      requested.bootstrapRevision,
    )
    || !sameProvenance(
      pending,
      debug.firmwareVersion,
      debug.hardwareRevision,
      debug.bootstrapRevision,
    )
    || !sameProvenance(
      pending,
      target.firmwareVersion,
      target.hardwareRevision,
      target.bootstrapRevision,
    )
  ) {
    return { ok: false, error: 'PROVENANCE_MISMATCH' };
  }

  const verifiedAtMs = parseIso(pop.verifiedAt);
  const consumedAtMs = parseIso(pop.consumedAt);
  if (
    verifiedAtMs == null
    || consumedAtMs == null
    || consumedAtMs < verifiedAtMs
  ) {
    return { ok: false, error: 'EVIDENCE_TIME_INVALID' };
  }

  const now = (dependencies.now ?? (() => new Date()))();
  const evidenceRecordedAt = latestIso(
    [
      pop.verifiedAt,
      pop.consumedAt,
      debug.recordedAt,
      target.recordedAt,
    ],
    now,
  );
  if (evidenceRecordedAt == null) {
    return { ok: false, error: 'EVIDENCE_TIME_INVALID' };
  }

  const canonicalEvidenceRefs: DeviceCredentialActivationEvidenceRefsV1 = {
    schemaVersion: 'device-credential-activation-evidence-refs-v1',
    protocolVersion: 1,
    deviceId: pending.deviceId,
    pendingCredentialVersion: pending.credentialVersion,
    popVerificationReceiptId: pop.receiptId,
    popChallengeId: pop.challengeId,
    debugStateReceiptId: debug.receiptId,
    targetEvidenceReceiptId: target.receiptId,
    firmwareVersion: pending.firmwareVersion,
    hardwareRevision: pending.hardwareRevision,
    bootstrapRevision: pending.bootstrapRevision,
    predecessorCredentialVersion: requested.predecessorCredentialVersion,
    authority: 'SERVER_SIDE_MANUFACTURING_EVIDENCE_AUTHORITY',
    recordedAt: evidenceRecordedAt,
  };

  const activatedAt = now.toISOString();
  const receipt: DeviceCredentialActivationReceiptV1 = {
    schemaVersion: 'device-credential-activation-receipt-v1',
    protocolVersion: 1,
    activationId: (dependencies.randomUuid ?? randomUUID)(),
    deviceId: pending.deviceId,
    credentialVersion: pending.credentialVersion,
    predecessorCredentialVersion:
      canonicalEvidenceRefs.predecessorCredentialVersion,
    cutoverType:
      canonicalEvidenceRefs.predecessorCredentialVersion == null
        ? 'INITIAL'
        : 'ROTATION',
    evidenceRefs: canonicalEvidenceRefs,
    resultingCredentialState: 'ACTIVE',
    predecessorResultingState:
      canonicalEvidenceRefs.predecessorCredentialVersion == null
        ? 'NONE'
        : 'REVOKED_PENDING_ERASE',
    activatedAt,
    deviceDataTrustAuthorized: false,
    networkTelemetryPersistenceAuthorized: false,
  };

  const validatedReceipt =
    DeviceCredentialActivationReceiptV1Schema.safeParse(receipt);
  if (!validatedReceipt.success) {
    return {
      ok: false,
      error: 'RECEIPT_CONSTRUCTION_FAILED',
      issues: validatedReceipt.error.issues.map((issue) =>
        `${issue.path.join('.') || '<root>'}: ${issue.message}`
      ),
    };
  }

  return {
    ok: true,
    receipt: validatedReceipt.data,
  };
}
