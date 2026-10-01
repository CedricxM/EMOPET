import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CANDIDATE_PATH =
  'config/partnerships/bretagne-canine-pilot-candidates-v1.json';
const EVIDENCE_PATH =
  'config/partnerships/bretagne-canine-pilot-evidence-v1.json';

const STATUS_EVIDENCE_TYPE = {
  OUTREACH_SENT: 'OUTBOUND_MESSAGE',
  RESPONSE_RECEIVED: 'INBOUND_MESSAGE',
  PILOT_SCOPE_DISCUSSION: 'PILOT_DISCUSSION_NOTE',
  LETTER_OF_INTEREST_RECEIVED: 'LETTER_OF_INTEREST',
  DECLINED: 'DECLINE',
  DEFERRED: 'INTERNAL_DEFER_DECISION',
};

const ALLOWED_EVIDENCE_TYPES = new Set([
  'OUTBOUND_MESSAGE',
  'INBOUND_MESSAGE',
  'PILOT_DISCUSSION_NOTE',
  'LETTER_OF_INTEREST',
  'DECLINE',
  'INTERNAL_DEFER_DECISION',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isPastOrPresentIso(value, nowMs) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

export function validateBretagneCaninePilotEvidence(
  candidateRegister,
  evidenceRegister,
  nowMs = Date.now(),
) {
  const errors = [];

  if (
    candidateRegister?.schemaVersion !==
    'emopet-bretagne-canine-pilot-candidates-v1'
  ) {
    errors.push('candidate register schemaVersion mismatch');
  }
  if (
    evidenceRegister?.schemaVersion !==
    'emopet-bretagne-canine-pilot-evidence-v1'
  ) {
    errors.push('evidence register schemaVersion mismatch');
  }

  const allowedStatuses = Array.isArray(candidateRegister?.allowedStatuses)
    ? new Set(candidateRegister.allowedStatuses)
    : new Set();

  const candidates = Array.isArray(candidateRegister?.candidates)
    ? candidateRegister.candidates
    : [];
  const receipts = Array.isArray(evidenceRegister?.receipts)
    ? evidenceRegister.receipts
    : [];

  const candidateIds = new Set();
  for (const candidate of candidates) {
    const id = candidate?.candidateId;
    if (!isNonEmptyString(id)) {
      errors.push('candidate has blank candidateId');
      continue;
    }
    if (candidateIds.has(id)) {
      errors.push(`${id}: duplicate candidateId`);
    }
    candidateIds.add(id);

    if (!isNonEmptyString(candidate.organisationName)) {
      errors.push(`${id}: blank organisationName`);
    }
    if (!allowedStatuses.has(candidate.relationshipStatus)) {
      errors.push(`${id}: relationshipStatus is not allowed`);
    }
    if (candidate.partnershipClaimAllowed !== false) {
      errors.push(`${id}: partnershipClaimAllowed must stay false`);
    }
    if (candidate.contactDataStored !== false) {
      errors.push(`${id}: contactDataStored must stay false`);
    }
    if (
      !Array.isArray(candidate.publicSources) ||
      candidate.publicSources.length === 0 ||
      candidate.publicSources.some((url) => !isHttpsUrl(url))
    ) {
      errors.push(`${id}: publicSources must be a non-empty HTTPS-only list`);
    }
  }

  const receiptIds = new Set();
  const receiptsByCandidate = new Map();

  for (const receipt of receipts) {
    const id = receipt?.receiptId;
    if (!isNonEmptyString(id)) {
      errors.push('evidence receipt has blank receiptId');
      continue;
    }
    if (receiptIds.has(id)) {
      errors.push(`${id}: duplicate receiptId`);
    }
    receiptIds.add(id);

    if (!candidateIds.has(receipt.candidateId)) {
      errors.push(`${id}: unknown candidateId ${receipt.candidateId ?? ''}`);
    }
    if (!allowedStatuses.has(receipt.status)) {
      errors.push(`${id}: receipt status is not allowed`);
    }
    if (!ALLOWED_EVIDENCE_TYPES.has(receipt.evidenceType)) {
      errors.push(`${id}: evidenceType is not allowed`);
    }
    if (!isPastOrPresentIso(receipt.occurredAt, nowMs)) {
      errors.push(`${id}: occurredAt must be a valid non-future timestamp`);
    }
    if (!isNonEmptyString(receipt.evidenceRef)) {
      errors.push(`${id}: evidenceRef is required`);
    }
    if (!isNonEmptyString(receipt.summary)) {
      errors.push(`${id}: summary is required`);
    }
    if (receipt.containsPersonalData !== false) {
      errors.push(`${id}: containsPersonalData must stay false`);
    }
    if (receipt.partnershipClaimAllowed !== false) {
      errors.push(`${id}: partnershipClaimAllowed must stay false`);
    }

    const list = receiptsByCandidate.get(receipt.candidateId) ?? [];
    list.push(receipt);
    receiptsByCandidate.set(receipt.candidateId, list);
  }

  for (const candidate of candidates) {
    const id = candidate?.candidateId;
    if (!isNonEmptyString(id)) continue;

    const status = candidate.relationshipStatus;
    const candidateReceipts = receiptsByCandidate.get(id) ?? [];

    if (status === 'CANDIDATE_NOT_CONTACTED') {
      if (candidateReceipts.length > 0) {
        errors.push(
          `${id}: candidate is still CANDIDATE_NOT_CONTACTED but evidence receipts already exist`,
        );
      }
      continue;
    }

    const expectedEvidenceType = STATUS_EVIDENCE_TYPE[status];
    if (!expectedEvidenceType) {
      errors.push(`${id}: no evidence policy exists for status ${status}`);
      continue;
    }

    const matchingReceipt = candidateReceipts.find(
      (receipt) =>
        receipt.status === status &&
        receipt.evidenceType === expectedEvidenceType,
    );

    if (!matchingReceipt) {
      errors.push(
        `${id}: status ${status} requires a matching ${expectedEvidenceType} receipt`,
      );
    }
  }

  return errors;
}

export async function validateBretagneCaninePilotEvidenceFiles(
  candidatePath = CANDIDATE_PATH,
  evidencePath = EVIDENCE_PATH,
  nowMs = Date.now(),
) {
  const [candidateRaw, evidenceRaw] = await Promise.all([
    readFile(candidatePath, 'utf8'),
    readFile(evidencePath, 'utf8'),
  ]);

  const candidateRegister = JSON.parse(candidateRaw);
  const evidenceRegister = JSON.parse(evidenceRaw);

  return validateBretagneCaninePilotEvidence(
    candidateRegister,
    evidenceRegister,
    nowMs,
  );
}

async function main() {
  const errors = await validateBretagneCaninePilotEvidenceFiles();
  if (errors.length > 0) {
    console.error('Bretagne canine pilot evidence gate FAILED:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    'Bretagne canine pilot evidence gate PASS: candidate statuses match controlled evidence receipts.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
