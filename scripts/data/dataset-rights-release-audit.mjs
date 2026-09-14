#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, resolve, sep } from 'node:path';

const REGISTRY_PATH = 'data/registry/real-datasets.json';
const RECEIPTS_ROOT = resolve('data/registry/receipts');
const ALLOWED_DISPOSITIONS = new Set(['GO', 'HOLD', 'REMEDIATE']);
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    fail(`${path}: unable to read valid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidNonFutureIso(value) {
  if (!isNonEmptyString(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= Date.now();
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function hasImmutableVersion(dataset) {
  if (!isNonEmptyString(dataset.versionTag)) return false;
  return !/current|controlled-at-retrieval|latest|unknown/i.test(dataset.versionTag);
}

function isControlledRelativePath(value) {
  return (
    isNonEmptyString(value) &&
    !isAbsolute(value) &&
    value !== '..' &&
    !value.startsWith('../') &&
    !value.includes('/../') &&
    !value.startsWith('..\\') &&
    !value.includes('\\..\\')
  );
}

function releaseBlockers(dataset) {
  const blockers = [];
  const requireString = (field) => {
    if (!isNonEmptyString(dataset[field])) blockers.push(field);
  };

  requireString('datasetId');
  requireString('versionTag');
  requireString('sourceUrl');
  requireString('licenseId');
  requireString('licenseUrl');
  requireString('attributionText');
  requireString('receiptPath');
  requireString('checksumSha256');
  requireString('retrievedAt');
  requireString('payloadFileName');
  requireString('storageLocation');
  requireString('allowedUseSummary');
  requireString('transformationsAllowedSummary');
  requireString('reviewerRole');
  requireString('reviewedAt');
  requireString('rightsReviewEvidencePath');

  if (!hasImmutableVersion(dataset)) blockers.push('immutable version');
  if (!isSha256(dataset.checksumSha256)) blockers.push('valid checksumSha256');
  if (!isValidNonFutureIso(dataset.retrievedAt)) blockers.push('valid non-future retrievedAt');
  if (!isValidNonFutureIso(dataset.reviewedAt)) blockers.push('valid non-future reviewedAt');
  if (dataset.commercialUseAllowed !== true) blockers.push('commercialUseAllowed=true');
  if (typeof dataset.derivativeWorksAllowed !== 'boolean') blockers.push('derivativeWorksAllowed decision');

  return [...new Set(blockers)];
}

const registry = readJson(REGISTRY_PATH);
if (!registry || !Array.isArray(registry.datasets)) {
  fail(`${REGISTRY_PATH}: datasets must be an array`);
}

const datasets = Array.isArray(registry?.datasets) ? registry.datasets : [];
const seenIds = new Set();
let goCount = 0;
let holdCount = 0;
let remediateCount = 0;

for (const dataset of datasets) {
  const id = isNonEmptyString(dataset.datasetId) ? dataset.datasetId : '<missing-datasetId>';

  if (seenIds.has(id)) fail(`${id}: duplicate datasetId`);
  seenIds.add(id);

  if (!isHttpUrl(dataset.sourceUrl)) fail(`${id}: sourceUrl must be an explicit HTTP(S) source pointer`);
  if (!isNonEmptyString(dataset.licenseId)) fail(`${id}: missing licence identifier`);
  if (!isHttpUrl(dataset.licenseUrl)) fail(`${id}: licenseUrl must point to legal/licence material`);
  if (!isNonEmptyString(dataset.attributionText)) fail(`${id}: missing required attribution/citation text`);
  if (!Array.isArray(dataset.expectedUse) || dataset.expectedUse.length === 0) {
    fail(`${id}: expectedUse must state the intended repository use`);
  }

  if (!ALLOWED_DISPOSITIONS.has(dataset.rightsDisposition)) {
    fail(`${id}: rightsDisposition must be one of GO | HOLD | REMEDIATE`);
  } else if (dataset.rightsDisposition === 'GO') {
    goCount += 1;
  } else if (dataset.rightsDisposition === 'HOLD') {
    holdCount += 1;
  } else {
    remediateCount += 1;
  }

  const hasReceiptPath = isNonEmptyString(dataset.receiptPath);
  const hasChecksum = isSha256(dataset.checksumSha256);
  if (hasReceiptPath !== hasChecksum) {
    fail(`${id}: receiptPath and a lowercase SHA-256 checksum must appear together`);
  }

  if (!hasReceiptPath) {
    if (!String(dataset.evidenceState ?? '').startsWith('RECEIPT_MISSING')) {
      fail(`${id}: absent receipt must remain explicit in evidenceState`);
    }
    if (dataset.retrievedAt !== null || dataset.payloadFileName !== null || dataset.storageLocation !== null) {
      fail(`${id}: missing controlled receipt cannot claim retrievedAt/payloadFileName/storageLocation`);
    }
    if (dataset.rightsDisposition === 'GO') {
      fail(`${id}: GO is forbidden without a controlled retrieval receipt`);
    }
  } else {
    if (!isControlledRelativePath(dataset.receiptPath)) {
      fail(`${id}: receiptPath must be a controlled repository-relative path`);
    }

    const receiptAbsolute = resolve(dataset.receiptPath);
    const receiptsPrefix = `${RECEIPTS_ROOT}${sep}`;
    if (!(receiptAbsolute === RECEIPTS_ROOT || receiptAbsolute.startsWith(receiptsPrefix))) {
      fail(`${id}: receiptPath must stay under data/registry/receipts/`);
    }
    if (!dataset.receiptPath.endsWith('.json')) {
      fail(`${id}: receiptPath must reference a JSON receipt`);
    }
    if (!existsSync(receiptAbsolute)) {
      fail(`${id}: receiptPath does not exist: ${dataset.receiptPath}`);
    } else {
      const receipt = readJson(dataset.receiptPath);
      if (receipt) {
        const exactBindings = [
          ['datasetId', dataset.datasetId],
          ['versionTag', dataset.versionTag],
          ['sourceUrl', dataset.sourceUrl],
          ['licenseId', dataset.licenseId],
          ['licenseUrl', dataset.licenseUrl],
          ['attributionText', dataset.attributionText],
          ['checksumSha256', dataset.checksumSha256],
          ['retrievedAt', dataset.retrievedAt],
          ['localFileName', dataset.payloadFileName],
          ['storageLocation', dataset.storageLocation],
        ];
        for (const [field, expected] of exactBindings) {
          if (receipt[field] !== expected) {
            fail(`${id}: receipt ${field} does not match the controlled registry value`);
          }
        }

        if (receipt.evidenceState !== 'RECEIPT_CAPTURED_NOT_RIGHTS_CLEARED') {
          fail(`${id}: receipt evidenceState must remain explicitly non-clearing`);
        }
        if (!isValidNonFutureIso(receipt.retrievedAt)) {
          fail(`${id}: receipt retrievedAt must be a valid non-future controlled landing timestamp`);
        }
        if (!Number.isFinite(receipt.byteSize) || receipt.byteSize <= 0) {
          fail(`${id}: receipt byteSize must be a positive number`);
        }
        if (basename(receipt.storageLocation ?? '') !== receipt.localFileName) {
          fail(`${id}: receipt storageLocation/localFileName binding is inconsistent`);
        }
        if (!receipt.rightsReview || receipt.rightsReview.disposition !== 'HOLD') {
          fail(`${id}: retrieval receipt must remain HOLD and cannot act as product-use authority`);
        }
      }
    }
  }

  if (dataset.rightsDisposition === 'GO') {
    const blockers = releaseBlockers(dataset);
    if (blockers.length > 0) {
      fail(`${id}: GO is fail-closed; missing/invalid evidence: ${blockers.join(', ')}`);
    }

    if (!isControlledRelativePath(dataset.storageLocation)) {
      fail(`${id}: GO requires a controlled repository-relative storageLocation`);
    }
    if (!isControlledRelativePath(dataset.rightsReviewEvidencePath)) {
      fail(`${id}: GO requires a controlled repository-relative rightsReviewEvidencePath`);
    } else if (!existsSync(resolve(dataset.rightsReviewEvidencePath))) {
      fail(`${id}: rightsReviewEvidencePath does not exist: ${dataset.rightsReviewEvidencePath}`);
    }
  }
}

// Negative policy self-checks. These fixtures are not rights evidence. They
// prove only that the release predicate cannot silently stop requiring one of
// the DATA-LIC-G1 evidence categories.
const syntheticReady = {
  datasetId: 'synthetic-policy-selftest',
  versionTag: 'v1.0.0',
  sourceUrl: 'https://example.invalid/dataset/v1',
  licenseId: 'EXAMPLE',
  licenseUrl: 'https://example.invalid/license',
  attributionText: 'Example attribution',
  receiptPath: 'data/registry/receipts/example.json',
  checksumSha256: 'a'.repeat(64),
  retrievedAt: '2026-01-01T00:00:00.000Z',
  payloadFileName: 'payload.zip',
  storageLocation: 'data/external/example/payload.zip',
  allowedUseSummary: 'Reviewed product use example',
  transformationsAllowedSummary: 'Reviewed transformation example',
  commercialUseAllowed: true,
  derivativeWorksAllowed: true,
  reviewerRole: 'Qualified rights reviewer',
  reviewedAt: '2026-01-02T00:00:00.000Z',
  rightsReviewEvidencePath: 'docs/control/example-rights-review.md',
};

if (releaseBlockers(syntheticReady).length !== 0) {
  fail('dataset release predicate self-test: complete synthetic fixture should have no structural blockers');
}

for (const field of [
  'receiptPath',
  'checksumSha256',
  'retrievedAt',
  'payloadFileName',
  'storageLocation',
  'allowedUseSummary',
  'transformationsAllowedSummary',
  'commercialUseAllowed',
  'derivativeWorksAllowed',
  'reviewerRole',
  'reviewedAt',
  'rightsReviewEvidencePath',
]) {
  const candidate = { ...syntheticReady };
  candidate[field] = null;
  if (releaseBlockers(candidate).length === 0) {
    fail(`dataset release predicate self-test: removing ${field} must fail closed`);
  }
}

if (failures.length > 0) {
  console.error('Dataset release-readiness rights audit FAILED:');
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log(
  `Dataset release-readiness rights audit PASS (${datasets.length} rows; GO=${goCount}, HOLD=${holdCount}, REMEDIATE=${remediateCount}).`,
);
console.log(
  'PASS means missing provenance/rights evidence cannot be promoted to GO by the controlled registry. It is not legal clearance or release authorization.',
);
