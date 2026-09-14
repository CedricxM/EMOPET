#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EVIDENCE_PATH = 'data/vbo/committed-snapshot-evidence.json';
const failures = [];

function fail(message) {
  failures.push(message);
}

function readBytes(path) {
  try {
    return readFileSync(resolve(path));
  } catch (error) {
    fail(`${path}: unable to read (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function readJson(path) {
  const bytes = readBytes(path);
  if (!bytes) return null;
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail(`${path}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function gitBlobSha(bytes) {
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

function requireHex(value, length, label) {
  if (typeof value !== 'string' || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    fail(`${label}: expected lowercase ${length}-hex value`);
  }
}

const evidence = readJson(EVIDENCE_PATH);
if (!evidence) {
  fail(`${EVIDENCE_PATH}: evidence is required`);
} else {
  if (evidence.schemaVersion !== 'emopet-vbo-committed-snapshot-evidence-v1') {
    fail(`${EVIDENCE_PATH}: unexpected schemaVersion`);
  }
  if (evidence.status !== 'COMMITTED_SNAPSHOT_TRACEABILITY_ONLY_UPSTREAM_RECEIPT_OPEN') {
    fail(`${EVIDENCE_PATH}: status must remain explicitly non-clearing`);
  }
  if (evidence.claimsUpstreamReleaseEquivalence !== false) {
    fail(`${EVIDENCE_PATH}: upstream release equivalence must remain false`);
  }
  if (evidence.claimsUpstreamImmutableCommitByteEquivalence !== true) {
    fail(`${EVIDENCE_PATH}: immutable-commit byte equivalence must remain explicit`);
  }
  if (evidence.claimsProductUseClearance !== false) {
    fail(`${EVIDENCE_PATH}: product-use clearance must remain false`);
  }
  if (evidence.upstreamRetrievalReceiptStatus !== 'RECEIPT_MISSING') {
    fail(`${EVIDENCE_PATH}: original upstream retrieval receipt must remain RECEIPT_MISSING`);
  }
  if (evidence.transformScriptHistoricalIdentityStatus !== 'NOT_PROVEN_FROM_RETAINED_RECEIPT') {
    fail(`${EVIDENCE_PATH}: historical transform-script identity must remain explicitly unproven`);
  }

  requireHex(evidence.payloadSha256, 64, 'payloadSha256');
  requireHex(evidence.committedPayloadGitBlobSha, 40, 'committedPayloadGitBlobSha');
  requireHex(evidence.upstreamVboJsonGitBlobSha, 40, 'upstreamVboJsonGitBlobSha');
  requireHex(evidence.derivedGitBlobSha, 40, 'derivedGitBlobSha');
  requireHex(evidence.datasetVersionSqlGitBlobSha, 40, 'datasetVersionSqlGitBlobSha');
  requireHex(evidence.currentGuardSqlGitBlobSha, 40, 'currentGuardSqlGitBlobSha');
  requireHex(evidence.upstreamImmutableCommit, 40, 'upstreamImmutableCommit');

  const payload = readBytes(evidence.payloadPath);
  if (payload) {
    if (payload.length !== evidence.payloadBytes) {
      fail(`${evidence.payloadPath}: byte length does not match evidence`);
    }
    if (sha256(payload) !== evidence.payloadSha256) {
      fail(`${evidence.payloadPath}: SHA-256 does not match committed evidence`);
    }
    if (gitBlobSha(payload) !== evidence.committedPayloadGitBlobSha) {
      fail(`${evidence.payloadPath}: Git blob SHA does not match committed evidence`);
    }
    if (evidence.committedPayloadGitBlobSha !== evidence.upstreamVboJsonGitBlobSha) {
      fail(`${EVIDENCE_PATH}: local/upstream Git blob equality claim is internally inconsistent`);
    }
    if (evidence.versionTag !== evidence.payloadSha256.slice(0, 12)) {
      fail(`${EVIDENCE_PATH}: versionTag must remain the recorded checksum prefix`);
    }
  }

  const derivedBytes = readBytes(evidence.derivedPath);
  if (derivedBytes) {
    if (gitBlobSha(derivedBytes) !== evidence.derivedGitBlobSha) {
      fail(`${evidence.derivedPath}: Git blob SHA drifted from committed snapshot evidence`);
    }
    let derived;
    try {
      derived = JSON.parse(derivedBytes.toString('utf8'));
    } catch (error) {
      fail(`${evidence.derivedPath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
    if (derived) {
      if (!Array.isArray(derived)) {
        fail(`${evidence.derivedPath}: expected an array`);
      } else {
        if (derived.length !== evidence.derivedRecordCount) {
          fail(`${evidence.derivedPath}: record count does not match evidence`);
        }
        const vboIds = new Set();
        const slugs = new Set();
        const expectedProvenance = {
          source: 'vbo',
          version: evidence.versionTag,
          retrieved_at: evidence.observedRetrievedAtFromCommittedDerivatives,
          license: evidence.repositoryLicenseLabel,
          attribution: evidence.repositoryAttribution,
        };
        for (const [index, row] of derived.entries()) {
          if (!row || typeof row !== 'object') {
            fail(`${evidence.derivedPath}: row ${index} is not an object`);
            continue;
          }
          if (typeof row.vbo_id !== 'string' || vboIds.has(row.vbo_id)) {
            fail(`${evidence.derivedPath}: row ${index} has missing/duplicate vbo_id`);
          } else {
            vboIds.add(row.vbo_id);
          }
          if (typeof row.breed_slug !== 'string' || slugs.has(row.breed_slug)) {
            fail(`${evidence.derivedPath}: row ${index} has missing/duplicate breed_slug`);
          } else {
            slugs.add(row.breed_slug);
          }
          if (JSON.stringify(row.provenance) !== JSON.stringify(expectedProvenance)) {
            fail(`${evidence.derivedPath}: row ${index} provenance drifted from committed evidence`);
          }
        }
      }
    }
  }

  const versionSqlBytes = readBytes(evidence.datasetVersionSqlPath);
  if (versionSqlBytes) {
    if (gitBlobSha(versionSqlBytes) !== evidence.datasetVersionSqlGitBlobSha) {
      fail(`${evidence.datasetVersionSqlPath}: Git blob SHA drifted from committed evidence`);
    }
    const versionSql = versionSqlBytes.toString('utf8');
    const expectedTuple = `VALUES ('vbo', '${evidence.versionTag}', '${evidence.payloadSha256}', ${evidence.derivedRecordCount}, 'Auto-ingested by ingest_vbo.ts')`;
    if (!versionSql.includes(expectedTuple)) {
      fail(`${evidence.datasetVersionSqlPath}: dataset/version/checksum/count binding is inconsistent`);
    }
  }

  if (!existsSync(resolve(evidence.transformScriptPath))) {
    fail(`${evidence.transformScriptPath}: referenced transform script is missing`);
  }

  const guardPath = 'data/vbo/breed_canonical_insert.sql';
  const guardBytes = readBytes(guardPath);
  if (guardBytes) {
    if (gitBlobSha(guardBytes) !== evidence.currentGuardSqlGitBlobSha) {
      fail(`${guardPath}: current fail-closed SQL guard drifted from committed evidence`);
    }
    const guard = guardBytes.toString('utf8');
    if (!guard.includes('RAISE EXCEPTION') || !guard.includes('Stale VBO SQL artifact')) {
      fail(`${guardPath}: current checked-in SQL must remain a fail-closed regeneration guard`);
    }
  }

  if (!existsSync(resolve('data/vbo/breed_canonical_insert.legacy.sql'))) {
    fail('data/vbo/breed_canonical_insert.legacy.sql: preserved historical snapshot is missing');
  }

  if (
    typeof evidence.upstreamImmutableCommitUrl !== 'string' ||
    !evidence.upstreamImmutableCommitUrl.includes(evidence.upstreamImmutableCommit)
  ) {
    fail(`${EVIDENCE_PATH}: immutable commit URL does not bind the recorded commit`);
  }
}

if (failures.length > 0) {
  console.error('VBO committed-snapshot traceability audit FAILED:');
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}

console.log('VBO committed-snapshot traceability audit PASS.');
console.log(
  'PASS proves repository-internal integrity/traceability of the committed VBO snapshot and derivatives only. Original retrieval receipt, historical transform identity, rights disposition and release authority remain open.',
);
