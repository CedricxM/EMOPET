import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRETAGNE_OPEN_DATA_API_BASE =
  'https://data.bretagne.bzh/api/explore/v2.1/catalog/datasets';

export const CONTROLLED_DATASET_IDS = new Set([
  'reserves-naturelles-regionales-de-bretagne',
]);

const DATASET_ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

function sha256Json(value) {
  return createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function normalizeFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('dataset fields must be a non-empty array');
  }

  const normalized = fields.map((raw, index) => {
    const field = requireObject(raw, `fields[${index}]`);
    if (typeof field.name !== 'string' || field.name.trim() === '') {
      throw new Error(`fields[${index}].name must be non-empty`);
    }
    if (typeof field.type !== 'string' || field.type.trim() === '') {
      throw new Error(`fields[${index}].type must be non-empty`);
    }

    return {
      name: field.name,
      type: field.type,
      label: typeof field.label === 'string' ? field.label : null,
      description:
        typeof field.description === 'string' ? field.description : null,
      annotations:
        field.annotations && typeof field.annotations === 'object'
          ? stable(field.annotations)
          : {},
    };
  });

  normalized.sort((a, b) => a.name.localeCompare(b.name));

  const names = normalized.map((field) => field.name);
  if (new Set(names).size !== names.length) {
    throw new Error('dataset schema contains duplicate field names');
  }

  return normalized;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function safeHeader(response, name) {
  try {
    return response.headers?.get?.(name) ?? null;
  } catch {
    return null;
  }
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'user-agent': 'EMOPET-controlled-schema-evidence/1.0',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  return {
    payload,
    headers: {
      etag: safeHeader(response, 'etag'),
      lastModified: safeHeader(response, 'last-modified'),
    },
  };
}

export function buildBretagneSchemaSnapshot({
  datasetId,
  metadata,
  recordsProbe,
  observedAt,
  metadataUrl,
  recordsProbeUrl,
  responseHeaders = {},
}) {
  if (!DATASET_ID_RE.test(datasetId) || !CONTROLLED_DATASET_IDS.has(datasetId)) {
    throw new Error(`dataset is not controlled for schema capture: ${datasetId}`);
  }

  const dataset = requireObject(metadata, 'metadata response');
  if (dataset.dataset_id !== datasetId) {
    throw new Error(
      `metadata dataset_id mismatch: expected ${datasetId}, got ${String(dataset.dataset_id)}`,
    );
  }

  const probe = requireObject(recordsProbe, 'records probe response');
  if (!Number.isSafeInteger(probe.total_count) || probe.total_count < 0) {
    throw new Error('records probe total_count must be a non-negative safe integer');
  }

  if (Array.isArray(probe.results) && probe.results.length !== 0) {
    throw new Error('records probe unexpectedly returned record payloads');
  }

  const fields = normalizeFields(dataset.fields);
  const fieldNames = fields.map((field) => field.name);
  const defaultMetas =
    dataset.metas?.default && typeof dataset.metas.default === 'object'
      ? dataset.metas.default
      : {};

  const metadataRecordCount = Number.isSafeInteger(defaultMetas.records_count)
    ? defaultMetas.records_count
    : null;
  const recordCount = probe.total_count;
  const countConsistent =
    metadataRecordCount == null || metadataRecordCount === recordCount;

  const metadataProcessedAt = stringOrNull(defaultMetas.metadata_processed);
  const dataProcessedAt = stringOrNull(defaultMetas.data_processed);
  const modifiedAt = stringOrNull(defaultMetas.modified);
  const licence = stringOrNull(defaultMetas.license);
  const licenceUrl = stringOrNull(defaultMetas.license_url);
  const publisher = stringOrNull(defaultMetas.publisher);
  const title = stringOrNull(defaultMetas.title);

  const schemaFingerprint = `sha256:${sha256Json(fields)}`;

  const immutableSnapshot = {
    datasetId,
    datasetUid: stringOrNull(dataset.dataset_uid),
    fields,
    recordCount,
    metadataRecordCount,
    metadataProcessedAt,
    dataProcessedAt,
    modifiedAt,
    licence,
    licenceUrl,
    publisher,
    title,
  };

  const sourceVersion = `sha256:${sha256Json(immutableSnapshot)}`;

  return {
    formatVersion: 'emopet-bretagne-open-data-schema-evidence-v1',
    authority: 'EVIDENCE_ONLY_NO_RELEASE_AUTHORITY',
    observedAt,
    source: {
      metadataUrl,
      recordsProbeUrl,
      metadataHeaders: responseHeaders.metadata ?? {},
      recordsProbeHeaders: responseHeaders.recordsProbe ?? {},
    },
    dataset: immutableSnapshot,
    schemaFingerprint,
    sourceVersion,
    countConsistent,
    schemaEvidenceCandidate: {
      observedAt,
      sourceVersion,
      schemaFingerprint,
      recordCount,
      fields: fieldNames,
      sourceUrl: metadataUrl,
      metadataProcessedAt,
      dataProcessedAt,
    },
    reviewBoundary: {
      releaseReady: false,
      rightsDisposition: null,
      note:
        'This artifact proves an observed API snapshot only. Human field minimisation and dataset-scoped rights review remain required.',
    },
  };
}

export async function captureBretagneSchemaEvidence({
  datasetId,
  fetchImpl = globalThis.fetch,
  observedAt = new Date().toISOString(),
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is required');
  }
  if (!DATASET_ID_RE.test(datasetId) || !CONTROLLED_DATASET_IDS.has(datasetId)) {
    throw new Error(`dataset is not controlled for schema capture: ${datasetId}`);
  }

  const metadataUrl = `${BRETAGNE_OPEN_DATA_API_BASE}/${encodeURIComponent(datasetId)}`;
  const recordsProbeUrl = `${metadataUrl}/records?limit=0`;

  const [metadataResponse, recordsProbeResponse] = await Promise.all([
    fetchJson(fetchImpl, metadataUrl),
    fetchJson(fetchImpl, recordsProbeUrl),
  ]);

  return buildBretagneSchemaSnapshot({
    datasetId,
    metadata: metadataResponse.payload,
    recordsProbe: recordsProbeResponse.payload,
    observedAt,
    metadataUrl,
    recordsProbeUrl,
    responseHeaders: {
      metadata: metadataResponse.headers,
      recordsProbe: recordsProbeResponse.headers,
    },
  });
}

function parseArgs(argv) {
  let datasetId = null;
  let output = 'artifacts/bretagne-open-data-schema-evidence.json';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dataset') {
      datasetId = argv[++index] ?? null;
    } else if (arg === '--output') {
      output = argv[++index] ?? output;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (!datasetId) {
    throw new Error('Usage: --dataset <controlled-dataset-id> [--output <path>]');
  }

  return { datasetId, output };
}

async function main() {
  const { datasetId, output } = parseArgs(process.argv.slice(2));
  const snapshot = await captureBretagneSchemaEvidence({ datasetId });
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        output: outputPath,
        datasetId,
        fieldCount: snapshot.dataset.fields.length,
        recordCount: snapshot.dataset.recordCount,
        metadataRecordCount: snapshot.dataset.metadataRecordCount,
        countConsistent: snapshot.countConsistent,
        schemaFingerprint: snapshot.schemaFingerprint,
        sourceVersion: snapshot.sourceVersion,
        releaseReady: false,
      },
      null,
      2,
    ),
  );

  if (!snapshot.countConsistent) {
    throw new Error(
      'live metadata records_count disagrees with the zero-row records probe total_count',
    );
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
