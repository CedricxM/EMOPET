/**
 * Région Bretagne Open Data — dataset-level allow-list.
 *
 * The portal itself is not treated as one blanket licence/authority.
 * Every dataset is reviewed separately and record retrieval remains blocked
 * until an explicit field allow-list exists.
 */

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
      'Official dataset identity and open-licence statement reviewed. Record schema/field minimisation and update policy still require explicit review before record retrieval.',
  },
] as const;

export function getBretagneOpenDataDataset(
  datasetId: string,
): BretagneOpenDataDatasetDescriptor | undefined {
  return BRETAGNE_OPEN_DATA_ALLOWLIST.find((entry) => entry.datasetId === datasetId);
}

export type BretagneOpenDataPreparedRequest =
  | {
      ready: false;
      reason: 'dataset_not_allowlisted' | 'fields_not_approved' | 'dataset_not_release_ready';
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
 * - exact record fields must be approved.
 *
 * Current v0 entries therefore fail closed.
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
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return { ready: false, reason: 'fields_not_approved' };
  }

  const url = new URL(`${BRETAGNE_OPEN_DATA_BASE}/${encodeURIComponent(datasetId)}/records`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('select', dataset.allowedRecordFields.join(','));

  return {
    ready: true,
    reason: 'ok',
    url: url.toString(),
    fields: dataset.allowedRecordFields,
  };
}
