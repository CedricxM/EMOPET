/**
 * Dataset-schema evidence for Région Bretagne Open Data.
 *
 * A dataset licence is not sufficient to authorize record ingestion. EMOPET
 * also requires a primary API schema observation that binds the exact dataset,
 * observed fields, approved fields and an immutable source/version reference.
 */

export type BretagneSchemaEvidenceState =
  | 'PRIMARY_API_SCHEMA_CONFIRMED'
  | 'SECONDARY_OBSERVATION_ONLY'
  | 'UNVERIFIED';

export interface BretagneOpenDataSchemaEvidence {
  receiptId: string;
  datasetId: string;
  metadataUrl: string;
  observedAt: string;
  recheckAt: string;
  immutableSourceVersion: string;
  observedFields: readonly string[];
  approvedFields: readonly string[];
  evidenceRef: string;
  reviewerRole: string;
  evidenceState: BretagneSchemaEvidenceState;
}

export type BretagneSchemaEvidenceBlocker =
  | 'NO_SCHEMA_EVIDENCE'
  | 'DATASET_ID_MISMATCH'
  | 'NOT_PRIMARY_API_EVIDENCE'
  | 'INVALID_METADATA_URL'
  | 'NO_IMMUTABLE_SOURCE_VERSION'
  | 'INVALID_EVIDENCE_POINTER'
  | 'INVALID_REVIEWER_ROLE'
  | 'INVALID_OR_EXPIRED_SCHEMA_REVIEW'
  | 'NO_OBSERVED_FIELDS'
  | 'DUPLICATE_OR_INVALID_OBSERVED_FIELDS'
  | 'NO_APPROVED_FIELDS'
  | 'APPROVED_FIELD_NOT_OBSERVED'
  | 'DESCRIPTOR_FIELDS_MISMATCH';

export interface BretagneSchemaEvidenceVerdict {
  datasetId: string;
  schemaUsable: boolean;
  blockers: readonly BretagneSchemaEvidenceBlocker[];
}

export interface BretagneSchemaGatedDataset {
  datasetId: string;
  allowedRecordFields: readonly string[];
  schemaEvidence?: BretagneOpenDataSchemaEvidence;
}

const FIELD_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_.:-]{0,127}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  if (leftSet.size !== left.length) return false;
  return right.every((value) => leftSet.has(value));
}

function isExactMetadataUrl(value: string, datasetId: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'data.bretagne.bzh' &&
      url.pathname ===
        `/api/explore/v2.1/catalog/datasets/${encodeURIComponent(datasetId)}` &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

/**
 * Fail-closed schema-evidence gate.
 *
 * Secondary observations can inform investigation, but only an exact primary
 * API observation can make the schema usable for a release decision.
 */
export function evaluateBretagneOpenDataSchemaEvidence(
  dataset: BretagneSchemaGatedDataset,
  nowMs: number = Date.now(),
): BretagneSchemaEvidenceVerdict {
  const blockers: BretagneSchemaEvidenceBlocker[] = [];
  const evidence = dataset.schemaEvidence;

  if (!evidence) {
    return {
      datasetId: dataset.datasetId,
      schemaUsable: false,
      blockers: ['NO_SCHEMA_EVIDENCE'],
    };
  }

  if (evidence.datasetId !== dataset.datasetId) {
    blockers.push('DATASET_ID_MISMATCH');
  }

  if (evidence.evidenceState !== 'PRIMARY_API_SCHEMA_CONFIRMED') {
    blockers.push('NOT_PRIMARY_API_EVIDENCE');
  }

  if (!isExactMetadataUrl(evidence.metadataUrl, dataset.datasetId)) {
    blockers.push('INVALID_METADATA_URL');
  }

  if (!isNonEmptyString(evidence.immutableSourceVersion)) {
    blockers.push('NO_IMMUTABLE_SOURCE_VERSION');
  }

  if (!isNonEmptyString(evidence.evidenceRef)) {
    blockers.push('INVALID_EVIDENCE_POINTER');
  }

  if (!isNonEmptyString(evidence.reviewerRole)) {
    blockers.push('INVALID_REVIEWER_ROLE');
  }

  const observedAt = Date.parse(evidence.observedAt);
  const recheckAt = Date.parse(evidence.recheckAt);
  if (
    !Number.isFinite(observedAt) ||
    observedAt > nowMs ||
    !Number.isFinite(recheckAt) ||
    recheckAt <= nowMs
  ) {
    blockers.push('INVALID_OR_EXPIRED_SCHEMA_REVIEW');
  }

  if (evidence.observedFields.length === 0) {
    blockers.push('NO_OBSERVED_FIELDS');
  } else {
    const observedSet = new Set(evidence.observedFields);
    if (
      observedSet.size !== evidence.observedFields.length ||
      evidence.observedFields.some(
        (field) => !isNonEmptyString(field) || !FIELD_ID_RE.test(field),
      )
    ) {
      blockers.push('DUPLICATE_OR_INVALID_OBSERVED_FIELDS');
    }
  }

  if (evidence.approvedFields.length === 0) {
    blockers.push('NO_APPROVED_FIELDS');
  } else if (
    evidence.approvedFields.some(
      (field) => !evidence.observedFields.includes(field),
    )
  ) {
    blockers.push('APPROVED_FIELD_NOT_OBSERVED');
  }

  if (!sameStringSet(dataset.allowedRecordFields, evidence.approvedFields)) {
    blockers.push('DESCRIPTOR_FIELDS_MISMATCH');
  }

  return {
    datasetId: dataset.datasetId,
    schemaUsable: blockers.length === 0,
    blockers,
  };
}
