#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

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
  schemaVersion: 'emopet-dataset-receipt-v1',
  datasetId: dataset.datasetId,
  name: dataset.name,
  versionTag: dataset.versionTag,
  doi: dataset.doi,
  sourceUrl: dataset.sourceUrl,
  licenseId: dataset.licenseId,
  licenseUrl: dataset.licenseUrl,
  attributionText: dataset.attributionText,
  retrievedAt: new Date().toISOString(),
  localFileName: basename(filePath),
  byteSize: statSync(filePath).size,
  checksumSha256,
  recordCount: recordCountArg ? Number(recordCountArg) : null,
  ingestionStatus: 'VERIFIED_LOCAL_FILE_NOT_YET_PROMOTED',
  notes: [
    'This receipt proves integrity/provenance of the local file only.',
    'It does not prove scientific suitability, production validation or permission beyond the recorded licence.',
  ],
};

const outputPath = resolve('data/registry/receipts', `${datasetId}-${checksumSha256.slice(0, 12)}.json`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ outputPath, checksumSha256, byteSize: receipt.byteSize }, null, 2));
