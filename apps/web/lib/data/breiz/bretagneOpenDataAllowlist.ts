/**
 * Région Bretagne Open Data — dataset-level allow-list.
 *
 * The portal itself is not treated as one blanket licence/authority.
 * Every dataset is reviewed separately and record retrieval remains blocked
 * until an explicit field allow-list and dataset-scoped rights receipt exist.
 */

import {
  getBreizSource,
  type BreizRightsEvidence,
  type BreizSourceDescriptor,
} from './sourceRegistry';
import {
  evaluateBretagneOpenDataSchemaEvidence,
  type BretagneOpenDataSchemaEvidence,
} from './bretagneOpenDataSchemaEvidence';

export type BretagneDatasetDomain =
  | 'territorial_context'
  | 'culture'
  | 'heritage'
  | 'events'
  | 'canine_network';

export type BretagneDatasetReviewStatus =
  | 'METADATA_REVIEWED_FIELDS_OPEN'
  | 'RELEASE_READY';

export interface BretagneOpenDataDatasetDescriptor {
  datasetId: string;
  title: string;
  canonicalUrl: string;
  producer: string;
  licence: string;
  licenceUrl: string;
  reviewedAt: string;
  purpose: string;
  domains: readonly BretagneDatasetDomain[];
  allowedRecordFields: readonly string[];
  status: BretagneDatasetReviewStatus;
  /** Exact dataset-level reuse/review receipt. Portal-level rights are not enough. */
  rightsEvidence?: BreizRightsEvidence;
  /** Exact primary API schema receipt. Secondary observations cannot release fields. */
  schemaEvidence?: BretagneOpenDataSchemaEvidence;
  notes: string;
}

export const BRETAGNE_OPEN_DATA_ALLOWLIST: readonly BretagneOpenDataDatasetDescriptor[] = [
  {
    datasetId: 'reserves-naturelles-regionales-de-bretagne',
    title: 'Réserves naturelles régionales de Bretagne',
    canonicalUrl:
      'https://data.bretagne.bzh/explore/dataset/reserves-naturelles-regionales-de-bretagne/',
    producer: 'Région Bretagne',
    licence: 'Licence Ouverte / Open Licence',
    licenceUrl: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
    reviewedAt: '2026-10-01',
    purpose:
      'Territorial context about officially designated regional nature reserves. Never infer dog access, dog-friendliness or local rules from reserve existence alone.',
    domains: ['territorial_context'],
    allowedRecordFields: [],
    status: 'METADATA_REVIEWED_FIELDS_OPEN',
    notes:
      'Official dataset identity and open-licence statement reviewed. Record schema/field minimisation, immutable dataset evidence and update policy still require explicit review before record retrieval.',
  },
] as const;

export function getBretagneOpenDataDataset(
  datasetId: string,
): BretagneOpenDataDatasetDescriptor | undefined {
  return BRETAGNE_OPEN_DATA_ALLOWLIST.find((entry) => entry.datasetId === datasetId);
}

export type BretagneDatasetRightsBlocker =
  | 'SOURCE_REGISTRY_MISSING'
  | 'SOURCE_DISABLED'
  | 'SOURCE_NO_RECHECK_RULE'
  | 'DATASET_NOT_RELEASE_READY'
  | 'NO_APPROVED_FIELDS'
  | 'NO_DATASET_LICENCE'
  | 'NO_DATASET_RIGHTS_EVIDENCE'
  | 'DATASET_RIGHTS_EVIDENCE_NOT_GO'
  | 'DATASET_RIGHTS_EVIDENCE_INVALID_OR_EXPIRED'
  | 'NO_PRIMARY_SCHEMA_EVIDENCE'
  | 'DATASET_SCHEMA_EVIDENCE_INVALID';

export interface BretagneDatasetRightsVerdict {
  datasetId: string;
  ingestionPermitted: boolean;
  blockers: readonly BretagneDatasetRightsBlocker[];
}

/**
 * Dataset-scoped rights gate.
 *
 * The parent portal deliberately keeps `license: null` because the portal is
 * a catalogue and individual datasets may carry different licences. This gate
 * therefore requires the exact dataset licence + receipt instead of treating
 * the portal as one blanket authority.
 */
export function evaluateBretagneOpenDataDatasetRights(
  dataset: BretagneOpenDataDatasetDescriptor,
  nowMs: number = Date.now(),
  source: BreizSourceDescriptor | undefined = getBreizSource(
    'region-bretagne-open-data',
  ),
): BretagneDatasetRightsVerdict {
  const blockers: BretagneDatasetRightsBlocker[] = [];

  if (!source) {
    blockers.push('SOURCE_REGISTRY_MISSING');
  } else {
    if (!source.enabled) blockers.push('SOURCE_DISABLED');
    if (source.freshnessHours == null) blockers.push('SOURCE_NO_RECHECK_RULE');
  }

  if (dataset.status !== 'RELEASE_READY') {
    blockers.push('DATASET_NOT_RELEASE_READY');
  }
  if (dataset.allowedRecordFields.length === 0) {
    blockers.push('NO_APPROVED_FIELDS');
  }
  if (!dataset.licence.trim() || !dataset.licenceUrl.trim()) {
    blockers.push('NO_DATASET_LICENCE');
  }

  const schemaVerdict = evaluateBretagneOpenDataSchemaEvidence(dataset, nowMs);
  if (!dataset.schemaEvidence) {
    blockers.push('NO_PRIMARY_SCHEMA_EVIDENCE');
  } else if (!schemaVerdict.schemaUsable) {
    blockers.push('DATASET_SCHEMA_EVIDENCE_INVALID');
  }

  const evidence = dataset.rightsEvidence;
  if (!evidence) {
    blockers.push('NO_DATASET_RIGHTS_EVIDENCE');
  } else {
    if (
      evidence.evidenceState !== 'SOURCE_CONFIRMED' ||
      evidence.disposition !== 'GO'
    ) {
      blockers.push('DATASET_RIGHTS_EVIDENCE_NOT_GO');
    }

    const reviewedAt = Date.parse(evidence.reviewedAt);
    const recheckAt =
      evidence.recheckAt == null ? null : Date.parse(evidence.recheckAt);

    const requiredText = [
      evidence.authorityRevision,
      evidence.immutableSourceVersion,
      evidence.receiptPath,
      evidence.attributionText,
      evidence.permittedUseSummary,
      evidence.reviewerRole,
    ];

    if (
      requiredText.some((value) => value.trim().length === 0) ||
      !Number.isFinite(reviewedAt) ||
      reviewedAt > nowMs ||
      (evidence.recheckAt != null &&
        (!Number.isFinite(recheckAt) || recheckAt! <= nowMs))
    ) {
      blockers.push('DATASET_RIGHTS_EVIDENCE_INVALID_OR_EXPIRED');
    }
  }

  return {
    datasetId: dataset.datasetId,
    ingestionPermitted: blockers.length === 0,
    blockers,
  };
}

export type BretagneOpenDataPreparedRequest =
  | {
      ready: false;
      reason:
        | 'dataset_not_allowlisted'
        | 'fields_not_approved'
        | 'dataset_not_release_ready'
        | 'dataset_rights_not_release_ready'
        | 'invalid_input';
    }
  | {
      ready: true;
      reason: 'ok';
      url: string;
      fields: readonly string[];
    };

const BRETAGNE_OPEN_DATA_BASE =
  'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets';

const DATASET_ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;

/**
 * Metadata lookup is allowed only for a dataset already present in the
 * repository allow-list. It performs no network I/O.
 */
export function prepareBretagneOpenDataMetadataRequest(
  datasetIdInput: string,
): BretagneOpenDataPreparedRequest {
  const datasetId = datasetIdInput.trim();

  if (!DATASET_ID_RE.test(datasetId) || !getBretagneOpenDataDataset(datasetId)) {
    return { ready: false, reason: 'dataset_not_allowlisted' };
  }

  return {
    ready: true,
    reason: 'ok',
    url: `${BRETAGNE_OPEN_DATA_BASE}/${encodeURIComponent(datasetId)}`,
    fields: [],
  };
}

/**
 * Record retrieval is stricter than metadata lookup:
 * - dataset must be allow-listed;
 * - review status must be RELEASE_READY;
 * - exact record fields must be approved;
 * - dataset-scoped rights evidence must be release-ready.
 *
 * Current entries therefore fail closed.
 */
export function prepareBretagneOpenDataRecordsRequest(
  datasetIdInput: string,
  limit = 20,
): BretagneOpenDataPreparedRequest {
  const datasetId = datasetIdInput.trim();
  const dataset = getBretagneOpenDataDataset(datasetId);

  if (!DATASET_ID_RE.test(datasetId) || !dataset) {
    return { ready: false, reason: 'dataset_not_allowlisted' };
  }
  if (dataset.status !== 'RELEASE_READY') {
    return { ready: false, reason: 'dataset_not_release_ready' };
  }
  if (dataset.allowedRecordFields.length === 0) {
    return { ready: false, reason: 'fields_not_approved' };
  }
  if (!evaluateBretagneOpenDataDatasetRights(dataset).ingestionPermitted) {
    return { ready: false, reason: 'dataset_rights_not_release_ready' };
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return { ready: false, reason: 'invalid_input' };
  }

  const url = new URL(
    `${BRETAGNE_OPEN_DATA_BASE}/${encodeURIComponent(datasetId)}/records`,
  );
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('select', dataset.allowedRecordFields.join(','));

  return {
    ready: true,
    reason: 'ok',
    url: url.toString(),
    fields: dataset.allowedRecordFields,
  };
}
