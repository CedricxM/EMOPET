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

const hash = createHash('sha256');
const stream = createReadStream(filePath);
for await (const chunk of stream) hash.update(chunk);
const checksumSha256 = hash.digest('hex');

const receipt = {
  schemaVersion: 'emopet-dataset-receipt-v2',
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
  retrievedAt: new Date().toISOString(),
  localFileName: basename(filePath),
  byteSize: statSync(filePath).size,
  checksumSha256,
  recordCount: recordCountArg ? Number(recordCountArg) : null,
  intendedUse: dataset.expectedUse ?? [],
  prohibitedShortcut: dataset.prohibitedShortcut ?? null,
  rightsReview: {
    reviewerRole: null,
    reviewedAt: null,
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
dataset.evidenceState = 'RECEIPT_CAPTURED_NOT_RIGHTS_CLEARED';
registry.registryVersion = `2026-09-06-rights-evidence-v1+receipt`;
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  registryPath,
  datasetId,
  checksumSha256,
  byteSize: receipt.byteSize,
  evidenceState: receipt.evidenceState,
  rightsDisposition: receipt.rightsReview.disposition,
}, null, 2));
