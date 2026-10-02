export const BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION =
  'emopet-bretagne-rnr-outbound-message-receipt-v1';

export const BRETAGNE_RNR_DATASET_ID =
  'reserves-naturelles-regionales-de-bretagne';

export const BRETAGNE_RNR_SOURCE_VERSION =
  'sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0';

export const BRETAGNE_RNR_OUTREACH_PACKET_PATH =
  'docs/partnerships/BRETAGNE_RNR_LICENCE_CLARIFICATION_OUTREACH_2026-10-02.md';

export const BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA =
  '9df9ab6d15b49c8c3d42bce016fcb4d325a9bfc7';

export const BRETAGNE_RNR_RECIPIENT_AUTHORITY_ROLE = 'Région Bretagne PRADA';

export const BRETAGNE_RNR_RECIPIENT_ADDRESS = 'prada@bretagne.bzh';

export const BRETAGNE_RNR_OUTREACH_SUBJECT =
  'Clarification de licence — jeu de données « Réserves naturelles régionales de Bretagne »';

export const BRETAGNE_RNR_OUTBOUND_PATCH_REVISION =
  'bretagne-rnr-outbound-message-register-patch-v1-2026-10-02';

const SHA256_REFERENCE_RE = /^sha256:[a-f0-9]{64}$/;
const GIT_BLOB_SHA_RE = /^[a-f0-9]{40}$/;
const RECEIPT_PATH_RE =
  /^data\/registry\/receipts\/bretagne-rnr-outbound-message-[a-f0-9]{12,64}\.json$/;

const REQUIRED_FIELDS = [
  'schemaVersion',
  'evidenceType',
  'datasetId',
  'sourceVersion',
  'outreachPacketPath',
  'outreachPacketGitBlobSha',
  'recipientAuthorityRole',
  'recipientAddress',
  'transportClass',
  'providerReferenceDigest',
  'subject',
  'sentAt',
  'capturedAt',
  'senderRole',
  'reviewerRole',
  'reviewedAt',
  'receiptPath',
  'messageBodyStoredInRepository',
  'privateContactDataStoredInRepository',
  'responseReceivedClaimed',
  'partnershipClaimed',
  'rightsPromoted',
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

export interface BretagneRnrOutboundMessageReceipt {
  schemaVersion: typeof BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION;
  evidenceType: 'OUTBOUND_MESSAGE';
  datasetId: typeof BRETAGNE_RNR_DATASET_ID;
  sourceVersion: typeof BRETAGNE_RNR_SOURCE_VERSION;
  outreachPacketPath: typeof BRETAGNE_RNR_OUTREACH_PACKET_PATH;
  outreachPacketGitBlobSha: typeof BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA;
  recipientAuthorityRole: typeof BRETAGNE_RNR_RECIPIENT_AUTHORITY_ROLE;
  recipientAddress: typeof BRETAGNE_RNR_RECIPIENT_ADDRESS;
  transportClass: 'EMAIL';
  providerReferenceDigest: string;
  subject: typeof BRETAGNE_RNR_OUTREACH_SUBJECT;
  sentAt: string;
  capturedAt: string;
  senderRole: string;
  reviewerRole: string;
  reviewedAt: string;
  receiptPath: string;
  messageBodyStoredInRepository: false;
  privateContactDataStoredInRepository: false;
  responseReceivedClaimed: false;
  partnershipClaimed: false;
  rightsPromoted: false;
}

export interface BretagneRnrOutboundRegisterPatchCandidate {
  candidateRevision: typeof BRETAGNE_RNR_OUTBOUND_PATCH_REVISION;
  candidateStatus: 'MANUAL_REGISTER_PATCH_REQUIRED';
  canApplyAutomatically: false;
  datasetId: typeof BRETAGNE_RNR_DATASET_ID;
  sourceVersion: typeof BRETAGNE_RNR_SOURCE_VERSION;
  receiptPath: string;
  patchOperations: readonly [
    {
      op: 'replace';
      path: '/clarificationRequest/messageSent';
      value: true;
    },
    {
      op: 'add';
      path: '/clarificationRequest/messageEvidenceRef';
      value: string;
    },
  ];
  unchangedBoundaries: {
    runtimeRightsDisposition: 'HOLD';
    releaseAllowed: false;
    fieldApprovalUnchanged: true;
    schemaEvidenceUnchanged: true;
    partnershipStatusUnchanged: true;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseTime(value: unknown): number | null {
  if (!nonEmptyString(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roleIsPrivacySafe(value: unknown): boolean {
  return (
    nonEmptyString(value) &&
    value.length <= 120 &&
    !value.includes('@') &&
    !/^https?:\/\//i.test(value)
  );
}

function addMismatch(
  errors: string[],
  receipt: Record<string, unknown>,
  field: RequiredField,
  expected: string,
) {
  if (receipt[field] !== expected) {
    errors.push(`${field} mismatch`);
  }
}

export function validateBretagneRnrOutboundMessageReceipt(
  candidate: unknown,
  nowMs: number = Date.now(),
): string[] {
  const errors: string[] = [];

  if (!isRecord(candidate)) return ['receipt must be an object'];

  const keys = Object.keys(candidate).sort();
  const expectedKeys = [...REQUIRED_FIELDS].sort();

  for (const required of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(candidate, required)) {
      errors.push(`missing required field ${required}`);
    }
  }

  for (const key of keys) {
    if (!expectedKeys.includes(key as RequiredField)) {
      errors.push(`unexpected field ${key}`);
    }
  }

  addMismatch(
    errors,
    candidate,
    'schemaVersion',
    BRETAGNE_RNR_OUTBOUND_RECEIPT_SCHEMA_VERSION,
  );
  addMismatch(errors, candidate, 'evidenceType', 'OUTBOUND_MESSAGE');
  addMismatch(errors, candidate, 'datasetId', BRETAGNE_RNR_DATASET_ID);
  addMismatch(errors, candidate, 'sourceVersion', BRETAGNE_RNR_SOURCE_VERSION);
  addMismatch(
    errors,
    candidate,
    'outreachPacketPath',
    BRETAGNE_RNR_OUTREACH_PACKET_PATH,
  );
  addMismatch(
    errors,
    candidate,
    'outreachPacketGitBlobSha',
    BRETAGNE_RNR_OUTREACH_PACKET_GIT_BLOB_SHA,
  );
  addMismatch(
    errors,
    candidate,
    'recipientAuthorityRole',
    BRETAGNE_RNR_RECIPIENT_AUTHORITY_ROLE,
  );
  addMismatch(
    errors,
    candidate,
    'recipientAddress',
    BRETAGNE_RNR_RECIPIENT_ADDRESS,
  );
  addMismatch(errors, candidate, 'transportClass', 'EMAIL');
  addMismatch(errors, candidate, 'subject', BRETAGNE_RNR_OUTREACH_SUBJECT);

  if (
    !nonEmptyString(candidate.providerReferenceDigest) ||
    !SHA256_REFERENCE_RE.test(candidate.providerReferenceDigest)
  ) {
    errors.push('providerReferenceDigest must be sha256:<64 lowercase hex>');
  }

  if (
    !nonEmptyString(candidate.outreachPacketGitBlobSha) ||
    !GIT_BLOB_SHA_RE.test(candidate.outreachPacketGitBlobSha)
  ) {
    errors.push('outreachPacketGitBlobSha must be a 40-character lowercase git blob SHA');
  }

  if (
    !nonEmptyString(candidate.receiptPath) ||
    !RECEIPT_PATH_RE.test(candidate.receiptPath)
  ) {
    errors.push('receiptPath must be a controlled RNR outbound-message receipt path');
  }

  if (!roleIsPrivacySafe(candidate.senderRole)) {
    errors.push('senderRole must be a non-email role label');
  }
  if (!roleIsPrivacySafe(candidate.reviewerRole)) {
    errors.push('reviewerRole must be a non-email role label');
  }

  const sentAt = parseTime(candidate.sentAt);
  const capturedAt = parseTime(candidate.capturedAt);
  const reviewedAt = parseTime(candidate.reviewedAt);

  if (sentAt == null || sentAt > nowMs) {
    errors.push('sentAt must be a valid non-future timestamp');
  }
  if (capturedAt == null || capturedAt > nowMs) {
    errors.push('capturedAt must be a valid non-future timestamp');
  }
  if (reviewedAt == null || reviewedAt > nowMs) {
    errors.push('reviewedAt must be a valid non-future timestamp');
  }
  if (sentAt != null && capturedAt != null && capturedAt < sentAt) {
    errors.push('capturedAt must not predate sentAt');
  }
  if (capturedAt != null && reviewedAt != null && reviewedAt < capturedAt) {
    errors.push('reviewedAt must not predate capturedAt');
  }

  for (const boundary of [
    'messageBodyStoredInRepository',
    'privateContactDataStoredInRepository',
    'responseReceivedClaimed',
    'partnershipClaimed',
    'rightsPromoted',
  ] as const) {
    if (candidate[boundary] !== false) {
      errors.push(`${boundary} must remain false`);
    }
  }

  return errors;
}

export function buildBretagneRnrOutboundRegisterPatchCandidate(
  receipt: BretagneRnrOutboundMessageReceipt,
): BretagneRnrOutboundRegisterPatchCandidate {
  return {
    candidateRevision: BRETAGNE_RNR_OUTBOUND_PATCH_REVISION,
    candidateStatus: 'MANUAL_REGISTER_PATCH_REQUIRED',
    canApplyAutomatically: false,
    datasetId: BRETAGNE_RNR_DATASET_ID,
    sourceVersion: BRETAGNE_RNR_SOURCE_VERSION,
    receiptPath: receipt.receiptPath,
    patchOperations: [
      {
        op: 'replace',
        path: '/clarificationRequest/messageSent',
        value: true,
      },
      {
        op: 'add',
        path: '/clarificationRequest/messageEvidenceRef',
        value: receipt.receiptPath,
      },
    ],
    unchangedBoundaries: {
      runtimeRightsDisposition: 'HOLD',
      releaseAllowed: false,
      fieldApprovalUnchanged: true,
      schemaEvidenceUnchanged: true,
      partnershipStatusUnchanged: true,
    },
  };
}

export function evaluateBretagneRnrOutboundMessageReceipt(
  candidate: unknown,
  nowMs: number = Date.now(),
): {
  valid: boolean;
  errors: readonly string[];
  registerPatchCandidate: BretagneRnrOutboundRegisterPatchCandidate | null;
} {
  const errors = validateBretagneRnrOutboundMessageReceipt(candidate, nowMs);

  return {
    valid: errors.length === 0,
    errors,
    registerPatchCandidate:
      errors.length === 0
        ? buildBretagneRnrOutboundRegisterPatchCandidate(
            candidate as BretagneRnrOutboundMessageReceipt,
          )
        : null,
  };
}
