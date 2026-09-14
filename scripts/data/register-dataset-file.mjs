#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';

const [datasetId, inputPath, recordCountArg] = process.argv.slice(2);
if (!datasetId || !inputPath) {
  console.error('Usage: node scripts/data/register-dataset-file.mjs <datasetId> <file> [recordCount]');
  process.exit(2);
}

const registryPath = resolve('data/registry/real-datasets.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const dataset = registry.datasets.find((entry) => entry.datasetId === datasetId);
if (!dataset) {
  console.error(`Unknown datasetId: ${datasetId}`);
  process.exit(2);
}

const vagueVersion = /current|controlled-at-retrieval|latest|unknown/i.test(String(dataset.versionTag ?? ''));
if (vagueVersion) {
  console.error(
    `Dataset ${datasetId} does not yet have an immutable versionTag (${dataset.versionTag}). ` +
    'Update the registry to an exact release/resource version before creating a controlled receipt.',
  );
  process.exit(3);
}

const filePath = resolve(inputPath);
if (!existsSync(filePath) || !statSync(filePath).isFile()) {
  console.error(`Dataset file not found: ${filePath}`);
  process.exit(2);
}

const storageLocation = relative(process.cwd(), filePath).replaceAll('\\', '/');
if (
  storageLocation === '..' ||
  storageLocation.startsWith('../') ||
  storageLocation.startsWith('/')
) {
  console.error(
    'Controlled dataset registration requires the landed payload to be inside the EMOPET working tree ' +
    '(normally under gitignored data/external/). Absolute/external machine paths are not accepted as evidence.',
  );
  process.exit(4);
}

const hash = createHash('sha256');
const stream = createReadStream(filePath);
for await (const chunk of stream) hash.update(chunk);
const checksumSha256 = hash.digest('hex');
const retrievedAt = new Date().toISOString();

const receipt = {
  schemaVersion: 'emopet-dataset-receipt-v3',
  evidenceState: 'RECEIPT_CAPTURED_NOT_RIGHTS_CLEARED',
  datasetId: dataset.datasetId,
  name: dataset.name,
  versionTag: dataset.versionTag,
  doi: dataset.doi,
  sourceUrl: dataset.sourceUrl,
  metadataApiUrl: dataset.metadataApiUrl ?? null,
  licenseId: dataset.licenseId,
  licenseUrl: dataset.licenseUrl,
  attributionText: dataset.attributionText,
  retrievedAt,
  localFileName: basename(filePath),
  storageLocation,
  byteSize: statSync(filePath).size,
  checksumSha256,
  recordCount: recordCountArg ? Number(recordCountArg) : null,
  intendedUse: dataset.expectedUse ?? [],
  prohibitedShortcut: dataset.prohibitedShortcut ?? null,
  rightsReview: {
    reviewerRole: null,
    reviewedAt: null,
    allowedUseSummary: null,
    transformationsAllowedSummary: null,
    commercialUseAllowed: null,
    derivativeWorksAllowed: null,
    evidencePath: null,
    disposition: 'HOLD',
    notes: 'Receipt proves identity/integrity only. Exact intended use and obligations still require review.',
  },
};

const outputPath = resolve(
  'data/registry/receipts',
  `${datasetId}-${checksumSha256.slice(0, 12)}.json`,
);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

const repoRelativeReceiptPath = relative(process.cwd(), outputPath).replaceAll('\\', '/');
dataset.checksumSha256 = checksumSha256;
dataset.receiptPath = repoRelativeReceiptPath;
dataset.retrievedAt = retrievedAt;
dataset.payloadFileName = receipt.localFileName;
dataset.storageLocation = storageLocation;
dataset.evidenceState = 'RECEIPT_CAPTURED_NOT_RIGHTS_CLEARED';

// A newly landed payload invalidates any earlier use review. Registration may
// capture identity/integrity evidence, but it must never manufacture product-use
// authority from a licence label or an older review.
dataset.allowedUseSummary = null;
dataset.transformationsAllowedSummary = null;
dataset.commercialUseAllowed = null;
dataset.derivativeWorksAllowed = null;
dataset.reviewerRole = null;
dataset.reviewedAt = null;
dataset.rightsReviewEvidencePath = null;
dataset.rightsDisposition = 'HOLD';

registry.registryVersion = '2026-09-14-rights-evidence-v4+receipt';
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  registryPath,
  datasetId,
  checksumSha256,
  byteSize: receipt.byteSize,
  retrievedAt,
  storageLocation,
  evidenceState: receipt.evidenceState,
  rightsDisposition: dataset.rightsDisposition,
}, null, 2));
