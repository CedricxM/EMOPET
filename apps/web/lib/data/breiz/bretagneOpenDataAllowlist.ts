/**
 * Région Bretagne Open Data — dataset-level allow-list.
 *
 * The portal itself is not treated as one blanket licence/authority.
 * Every dataset is reviewed separately and record retrieval remains blocked
 * until explicit field, schema-freshness and dataset-scoped rights evidence exist.
 */

import {
  getBreizSource,
  type BreizRightsEvidence,
  type BreizSourceDescriptor,
} from './sourceRegistry';

export type BretagneDatasetDomain =
  | 'territorial_context'
  | 'culture'
  | 'heritage'
  | 'events'
  | 'canine_network';

export type BretagneDatasetReviewStatus =
  | 'METADATA_REVIEWED_FIELDS_OPEN'
  | 'RELEASE_READY';

export interface BretagneDatasetSchemaEvidence {
  /** Time when the exact live API schema snapshot was observed. */
  observedAt: string;
  /** Immutable/version-like identifier covering the exact reviewed dataset snapshot. */
  sourceVersion: string;
  /** Stable digest or canonical fingerprint of the reviewed schema. */
  schemaFingerprint: string;
  /** Record count observed with the same snapshot. */
  recordCount: number;
  /** Exact field names present in the reviewed live schema. */
  fields: readonly string[];
  /** Exact API/source URL used to obtain the snapshot. */
  sourceUrl: string;
  metadataProcessedAt?: string | null;
  dataProcessedAt?: string | null;
}

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
  /** Fresh exact-schema observation required before record retrieval can be released. */
  schemaEvidence?: BretagneDatasetSchemaEvidence;
  /** Exact dataset-level reuse/review receipt. Portal-level rights are not enough. */
  rightsEvidence?: BreizRightsEvidence;
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
    allowedRecordFields: [
      'id',
      'nom',
      'geo_point_2d',
      'surface',
      'date_creation',
    ],
    status: 'METADATA_REVIEWED_FIELDS_OPEN',
    schemaEvidence: {
      observedAt: '2026-10-01T16:38:59.589Z',
      sourceVersion:
        'sha256:65ff0d253fd1a1bddd6ce05389fe4b35c8946cfbcd8787c9d5afaee092506cd0',
      schemaFingerprint:
        'sha256:c1c150f210e79b85c31525863b6ee92dd7d96a504c61fc0456c38e38355eb9dd',
      recordCount: 11,
      fields: [
        'credit_photo',
        'date_creation',
        'description',
        'geo_point_2d',
        'geo_shape',
        'gml_id',
        'id',
        'image',
        'latitude',
        'lien_plaquette',
        'longitude',
        'nom',
        'nom_long',
        'search_id',
        'site_web',
        'site_web_ext',
        'surface',
      ],
      sourceUrl:
        'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-de-bretagne',
      metadataProcessedAt: '2026-09-27T03:39:40.891000+00:00',
      dataProcessedAt: '2026-09-20T03:16:25+00:00',
    },
    notes:
      'Live schema captured on 2026-10-01 with a zero-row probe. Five low-risk territorial fields are approved: id, nom, geo_point_2d, surface and date_creation. Description, media, external links, technical identifiers and redundant geometry fields remain excluded. Dataset status stays METADATA_REVIEWED_FIELDS_OPEN and record retrieval remains blocked until dataset-scoped rights/recheck evidence is promoted.',
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
  | 'NO_SCHEMA_EVIDENCE'
  | 'SCHEMA_EVIDENCE_INVALID_OR_STALE'
  | 'APPROVED_FIELDS_NOT_IN_SCHEMA'
  | 'NO_DATASET_RIGHTS_EVIDENCE'
  | 'DATASET_RIGHTS_EVIDENCE_NOT_GO'
  | 'DATASET_RIGHTS_EVIDENCE_INVALID_OR_EXPIRED'
  | 'RIGHTS_VERSION_SCHEMA_MISMATCH';

export interface BretagneDatasetRightsVerdict {
  datasetId: string;
  ingestionPermitted: boolean;
  blockers: readonly BretagneDatasetRightsBlocker[];
}

function parseEvidenceTime(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Dataset-scoped rights + schema-freshness gate.
 *
 * The parent portal deliberately keeps `license: null` because the portal is
 * a catalogue and individual datasets may carry different licences. Record
 * retrieval therefore requires both exact dataset rights and a fresh exact
 * schema snapshot bound to the same source version.
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

  const schema = dataset.schemaEvidence;
  if (!schema) {
    blockers.push('NO_SCHEMA_EVIDENCE');
  } else {
    const observedAt = parseEvidenceTime(schema.observedAt);
    const fieldsAreValid =
      schema.fields.length > 0 &&
      new Set(schema.fields).size === schema.fields.length &&
      schema.fields.every((field) => field.trim().length > 0);
    const recordCountIsValid =
      Number.isSafeInteger(schema.recordCount) && schema.recordCount >= 0;
    const freshnessWindowMs =
      source?.freshnessHours == null ? null : source.freshnessHours * 60 * 60 * 1000;
    const isFresh =
      observedAt != null &&
      observedAt <= nowMs &&
      (freshnessWindowMs == null || observedAt + freshnessWindowMs > nowMs);

    if (
      schema.sourceVersion.trim().length === 0 ||
      schema.schemaFingerprint.trim().length === 0 ||
      schema.sourceUrl.trim().length === 0 ||
      !fieldsAreValid ||
      !recordCountIsValid ||
      !isFresh
    ) {
      blockers.push('SCHEMA_EVIDENCE_INVALID_OR_STALE');
    }

    if (
      dataset.allowedRecordFields.length > 0 &&
      !dataset.allowedRecordFields.every((field) => schema.fields.includes(field))
    ) {
      blockers.push('APPROVED_FIELDS_NOT_IN_SCHEMA');
    }
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

    const reviewedAt = parseEvidenceTime(evidence.reviewedAt);
    const recheckAt =
      evidence.recheckAt == null ? null : parseEvidenceTime(evidence.recheckAt);

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
      reviewedAt == null ||
      reviewedAt > nowMs ||
      (evidence.recheckAt != null && (recheckAt == null || recheckAt <= nowMs))
    ) {
      blockers.push('DATASET_RIGHTS_EVIDENCE_INVALID_OR_EXPIRED');
    }

    if (
      schema &&
      evidence.immutableSourceVersion.trim().length > 0 &&
      schema.sourceVersion.trim().length > 0 &&
      evidence.immutableSourceVersion !== schema.sourceVersion
    ) {
      blockers.push('RIGHTS_VERSION_SCHEMA_MISMATCH');
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
 * - fresh exact-schema evidence must cover those fields;
 * - dataset-scoped rights evidence must cover the same source version.
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
