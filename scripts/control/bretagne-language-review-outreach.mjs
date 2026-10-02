import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CANDIDATE_PATH =
  'config/partnerships/bretagne-language-review-outreach-v1.json';
const EVIDENCE_PATH =
  'config/partnerships/bretagne-language-review-outreach-evidence-v1.json';

const STATUS_EVIDENCE_TYPE = {
  OUTREACH_SENT: 'OUTBOUND_MESSAGE',
  RESPONSE_RECEIVED: 'INBOUND_MESSAGE',
  REVIEW_SCOPE_DISCUSSION: 'REVIEW_SCOPE_DISCUSSION_NOTE',
  REVIEW_SCOPE_AGREED: 'REVIEW_SCOPE_AGREEMENT',
  DECLINED: 'DECLINE',
  DEFERRED: 'INTERNAL_DEFER_DECISION',
};

const ALLOWED_EVIDENCE_TYPES = new Set([
  'OUTBOUND_MESSAGE',
  'INBOUND_MESSAGE',
  'REVIEW_SCOPE_DISCUSSION_NOTE',
  'REVIEW_SCOPE_AGREEMENT',
  'DECLINE',
  'INTERNAL_DEFER_DECISION',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function httpsUrl(value) {
  if (!nonEmpty(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function nonFutureIso(value, nowMs) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

export function validateBretagneLanguageReviewOutreach(
  register,
  evidenceRegister,
  nowMs = Date.now(),
) {
  const errors = [];

  if (
    register?.schemaVersion !==
    'emopet-bretagne-language-review-outreach-v1'
  ) {
    errors.push('candidate register schemaVersion mismatch');
  }
  if (
    evidenceRegister?.schemaVersion !==
    'emopet-bretagne-language-review-outreach-evidence-v1'
  ) {
    errors.push('evidence register schemaVersion mismatch');
  }

  const allowedRelationships = new Set(
    Array.isArray(register?.allowedRelationshipStatuses)
      ? register.allowedRelationshipStatuses
      : [],
  );
  const allowedPreparation = new Set(
    Array.isArray(register?.allowedPreparationStatuses)
      ? register.allowedPreparationStatuses
      : [],
  );
  const candidates = Array.isArray(register?.candidates)
    ? register.candidates
    : [];
  const receipts = Array.isArray(evidenceRegister?.receipts)
    ? evidenceRegister.receipts
    : [];

  const candidateIds = new Set();

  for (const candidate of candidates) {
    const id = candidate?.candidateId;
    if (!nonEmpty(id)) {
      errors.push('candidate has blank candidateId');
      continue;
    }
    if (candidateIds.has(id)) errors.push(`${id}: duplicate candidateId`);
    candidateIds.add(id);

    if (!nonEmpty(candidate.organisationName)) {
      errors.push(`${id}: organisationName required`);
    }
    if (!nonEmpty(candidate.reviewDomain)) {
      errors.push(`${id}: reviewDomain required`);
    }
    if (!allowedRelationships.has(candidate.relationshipStatus)) {
      errors.push(`${id}: relationshipStatus is not allowed`);
    }
    if (!allowedPreparation.has(candidate.preparationStatus)) {
      errors.push(`${id}: preparationStatus is not allowed`);
    }
    if (
      !Array.isArray(candidate.proposedReviewItems) ||
      candidate.proposedReviewItems.length === 0 ||
      candidate.proposedReviewItems.some((item) => !nonEmpty(item))
    ) {
      errors.push(`${id}: proposedReviewItems must be non-empty`);
    }
    if (
      !Array.isArray(candidate.publicSources) ||
      candidate.publicSources.length === 0 ||
      candidate.publicSources.some((url) => !httpsUrl(url))
    ) {
      errors.push(`${id}: publicSources must be HTTPS-only and non-empty`);
    }
    if (candidate.partnershipClaimAllowed !== false) {
      errors.push(`${id}: partnershipClaimAllowed must stay false`);
    }
    if (candidate.reviewerClaimAllowed !== false) {
      errors.push(`${id}: reviewerClaimAllowed must stay false`);
    }
    if (candidate.contactDataStored !== false) {
      errors.push(`${id}: contactDataStored must stay false`);
    }

    if (
      candidate.preparationStatus === 'DRAFT_PREPARED' &&
      candidate.relationshipStatus !== 'CANDIDATE_NOT_CONTACTED'
    ) {
      // A prepared draft is not evidence of an outbound message. If the
      // relationship has advanced, a separate outbound/inbound receipt must
      // carry that state.
      const hasAnyReceipt = receipts.some(
        (receipt) => receipt?.candidateId === id,
      );
      if (!hasAnyReceipt) {
        errors.push(
          `${id}: DRAFT_PREPARED cannot justify relationship state ${candidate.relationshipStatus}`,
        );
      }
    }
  }

  const receiptIds = new Set();
  const receiptsByCandidate = new Map();

  for (const receipt of receipts) {
    const id = receipt?.receiptId;
    if (!nonEmpty(id)) {
      errors.push('evidence receipt has blank receiptId');
      continue;
    }
    if (receiptIds.has(id)) errors.push(`${id}: duplicate receiptId`);
    receiptIds.add(id);

    if (!candidateIds.has(receipt.candidateId)) {
      errors.push(`${id}: unknown candidateId ${receipt.candidateId ?? ''}`);
    }
    if (!allowedRelationships.has(receipt.status)) {
      errors.push(`${id}: receipt status is not allowed`);
    }
    if (!ALLOWED_EVIDENCE_TYPES.has(receipt.evidenceType)) {
      errors.push(`${id}: evidenceType is not allowed`);
    }
    if (!nonFutureIso(receipt.occurredAt, nowMs)) {
      errors.push(`${id}: occurredAt must be valid and non-future`);
    }
    if (!nonEmpty(receipt.evidenceRef)) {
      errors.push(`${id}: evidenceRef required`);
    }
    if (!nonEmpty(receipt.summary)) {
      errors.push(`${id}: summary required`);
    }
    if (receipt.containsPersonalData !== false) {
      errors.push(`${id}: containsPersonalData must stay false`);
    }
    if (receipt.partnershipClaimAllowed !== false) {
      errors.push(`${id}: partnershipClaimAllowed must stay false`);
    }
    if (receipt.reviewerClaimAllowed !== false) {
      errors.push(`${id}: reviewerClaimAllowed must stay false`);
    }

    const existing = receiptsByCandidate.get(receipt.candidateId) ?? [];
    existing.push(receipt);
    receiptsByCandidate.set(receipt.candidateId, existing);
  }

  for (const candidate of candidates) {
    const id = candidate?.candidateId;
    if (!nonEmpty(id)) continue;
    const status = candidate.relationshipStatus;
    const candidateReceipts = receiptsByCandidate.get(id) ?? [];

    if (status === 'CANDIDATE_NOT_CONTACTED') {
      if (candidateReceipts.some((receipt) => receipt.evidenceType !== 'INTERNAL_DEFER_DECISION')) {
        errors.push(
          `${id}: CANDIDATE_NOT_CONTACTED cannot coexist with communication evidence`,
        );
      }
      continue;
    }

    const expected = STATUS_EVIDENCE_TYPE[status];
    if (!expected) {
      errors.push(`${id}: no evidence policy for status ${status}`);
      continue;
    }

    if (
      !candidateReceipts.some(
        (receipt) =>
          receipt.status === status && receipt.evidenceType === expected,
      )
    ) {
      errors.push(
        `${id}: status ${status} requires matching ${expected} receipt`,
      );
    }
  }

  return errors;
}

export async function validateBretagneLanguageReviewOutreachFiles(
  candidatePath = CANDIDATE_PATH,
  evidencePath = EVIDENCE_PATH,
  nowMs = Date.now(),
) {
  const [candidateRaw, evidenceRaw] = await Promise.all([
    readFile(candidatePath, 'utf8'),
    readFile(evidencePath, 'utf8'),
  ]);

  return validateBretagneLanguageReviewOutreach(
    JSON.parse(candidateRaw),
    JSON.parse(evidenceRaw),
    nowMs,
  );
}

async function main() {
  const errors = await validateBretagneLanguageReviewOutreachFiles();

  if (errors.length > 0) {
    console.error('Bretagne language-review outreach gate FAILED:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    'Bretagne language-review outreach gate PASS: prepared drafts remain distinct from evidence-backed relationship state.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
