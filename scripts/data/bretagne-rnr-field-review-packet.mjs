import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION =
  'bretagne-rnr-field-review-packet-v1-2026-10-02';

export const DEFAULT_SCHEMA_RECEIPT_PATH =
  'data/registry/schema-evidence/reserves-naturelles-regionales-de-bretagne-65ff0d253fd1.json';

export const DEFAULT_DATASET_ID =
  'reserves-naturelles-regionales-de-bretagne';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function uniqueStrings(values) {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every(nonEmpty) &&
    new Set(values).size === values.length
  );
}

export function validateBretagneRnrFieldReviewSource(receipt) {
  const errors = [];

  if (receipt?.datasetId !== DEFAULT_DATASET_ID) {
    errors.push('datasetId mismatch');
  }
  if (!nonEmpty(receipt?.sourceVersion)) {
    errors.push('sourceVersion missing');
  }
  if (!nonEmpty(receipt?.schemaFingerprint)) {
    errors.push('schemaFingerprint missing');
  }
  if (!Array.isArray(receipt?.fieldInventory) || receipt.fieldInventory.length === 0) {
    errors.push('fieldInventory missing');
  }

  const fieldNames = Array.isArray(receipt?.fieldInventory)
    ? receipt.fieldInventory.map((field) => field?.name)
    : [];

  if (!uniqueStrings(fieldNames)) {
    errors.push('fieldInventory names must be unique non-empty strings');
  }

  const candidateFields = Array.isArray(receipt?.candidateMinimumFields)
    ? receipt.candidateMinimumFields
    : [];

  if (candidateFields.length === 0) {
    errors.push('candidateMinimumFields missing');
  }

  const candidateNames = candidateFields.map((field) => field?.name);
  if (!uniqueStrings(candidateNames)) {
    errors.push('candidate field names must be unique non-empty strings');
  }

  for (const candidate of candidateFields) {
    if (candidate?.state !== 'CANDIDATE') {
      errors.push(`${candidate?.name ?? '<unknown>'}: candidate state must remain CANDIDATE`);
    }
    if (!nonEmpty(candidate?.reason)) {
      errors.push(`${candidate?.name ?? '<unknown>'}: candidate reason missing`);
    }
    if (!fieldNames.includes(candidate?.name)) {
      errors.push(`${candidate?.name ?? '<unknown>'}: candidate not present in live schema inventory`);
    }
  }

  const deferredGroups = Array.isArray(receipt?.deferredFields)
    ? receipt.deferredFields
    : [];
  const deferredNames = deferredGroups.flatMap((group) =>
    Array.isArray(group?.fields) ? group.fields : [],
  );

  if (new Set(deferredNames).size !== deferredNames.length) {
    errors.push('deferred field names must not be duplicated across groups');
  }

  for (const deferred of deferredNames) {
    if (!fieldNames.includes(deferred)) {
      errors.push(`${deferred}: deferred field not present in live schema inventory`);
    }
    if (candidateNames.includes(deferred)) {
      errors.push(`${deferred}: field cannot be both candidate and deferred`);
    }
  }

  if (receipt?.runtimeIngestionPermitted !== false) {
    errors.push('runtimeIngestionPermitted must remain false before field approval');
  }
  if (receipt?.releaseDisposition !== 'HOLD') {
    errors.push('releaseDisposition must remain HOLD before field approval');
  }

  return errors;
}

export function buildBretagneRnrFieldReviewPacket(receipt) {
  const errors = validateBretagneRnrFieldReviewSource(receipt);
  if (errors.length > 0) {
    throw new Error(
      'Bretagne RNR field review source is invalid:\n- ' + errors.join('\n- '),
    );
  }

  const fieldTypeByName = new Map(
    receipt.fieldInventory.map((field) => [field.name, field.type]),
  );

  return {
    schemaVersion: 'emopet-bretagne-rnr-field-review-packet-v1',
    packetRevision: BRETAGNE_RNR_FIELD_REVIEW_PACKET_REVISION,
    status: 'DRAFT_HUMAN_REVIEW_REQUIRED',
    datasetId: receipt.datasetId,
    datasetUid: receipt.datasetUid ?? null,
    sourceAuthority: receipt.sourceAuthority,
    sourceVersion: receipt.sourceVersion,
    schemaFingerprint: receipt.schemaFingerprint,
    schemaEvidencePath: DEFAULT_SCHEMA_RECEIPT_PATH,
    purposeBoundary:
      'Approve only the minimum fields needed to identify and place an official regional nature reserve as territorial context. Do not authorize dog-access, leash-rule, opening-hours, safety or dog-friendly claims.',
    candidateFields: receipt.candidateMinimumFields.map((candidate) => ({
      name: candidate.name,
      type: fieldTypeByName.get(candidate.name) ?? null,
      reason: candidate.reason,
      requestedDisposition: ['APPROVE', 'REJECT', 'APPROVE_WITH_CONDITIONS'],
    })),
    deferredFieldGroups: receipt.deferredFields.map((group) => ({
      fields: [...group.fields],
      reason: group.reason,
    })),
    responseTemplate: {
      requiredFields: [
        'disposition',
        'reviewer_role',
        'reviewed_at',
        'evidence_reference',
        'approved_fields',
        'purpose_boundary_confirmation',
        'conditions_or_restrictions',
      ],
      allowedDisposition: [
        'APPROVE',
        'REJECT',
        'APPROVE_WITH_CONDITIONS',
      ],
      automaticApplyAllowed: false,
    },
    sourceState: {
      releaseDisposition: receipt.releaseDisposition,
      rightsDisposition: receipt.rightsDisposition,
      runtimeIngestionPermitted: receipt.runtimeIngestionPermitted,
      licenceReconciliationStatus:
        receipt.licenceObservation?.reconciliationStatus ?? null,
    },
  };
}

export async function buildBretagneRnrFieldReviewPacketFromFile(
  receiptPath = DEFAULT_SCHEMA_RECEIPT_PATH,
) {
  const raw = await readFile(receiptPath, 'utf8');
  const receipt = JSON.parse(raw);
  return buildBretagneRnrFieldReviewPacket(receipt);
}

function parseArgs(argv) {
  let receiptPath = DEFAULT_SCHEMA_RECEIPT_PATH;
  let output = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--receipt') {
      receiptPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--output') {
      output = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!nonEmpty(receiptPath)) {
    throw new Error('--receipt requires a non-empty path');
  }
  if (output != null && !nonEmpty(output)) {
    throw new Error('--output requires a non-empty path');
  }

  return { receiptPath, output };
}

async function main() {
  const { receiptPath, output } = parseArgs(process.argv.slice(2));
  const packet = await buildBretagneRnrFieldReviewPacketFromFile(receiptPath);
  const serialized = JSON.stringify(packet, null, 2) + '\n';

  if (output) {
    await writeFile(output, serialized, 'utf8');
    console.log(`Wrote Bretagne RNR field review packet to ${output}`);
    return;
  }

  process.stdout.write(serialized);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
