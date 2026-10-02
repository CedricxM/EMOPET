import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REGISTER_PATH =
  'data/registry/receipts/bretagne-rnr-licence-clarification-v1.json';
const SCHEMA_EVIDENCE_PATH =
  'data/registry/schema-evidence/reserves-naturelles-regionales-de-bretagne-65ff0d253fd1.json';
const RUNTIME_DATASET_PATH =
  'apps/web/lib/data/breiz/bretagneOpenDataAllowlist.ts';

const REQUIRED_OBSERVATIONS = new Set([
  'PRIMARY_API_METADATA',
  'CANONICAL_ETALAB_PAGE',
  'DATAGOUV_MIRROR',
  'LEGACY_PDF_IDENTIFICATION',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateBretagneRnrLicenceClarification(register, schemaEvidence) {
  const errors = [];

  if (
    register?.schemaVersion !==
    'emopet-bretagne-rnr-licence-clarification-v1'
  ) {
    errors.push('schemaVersion mismatch');
  }

  if (
    register?.datasetId !==
    'reserves-naturelles-regionales-de-bretagne'
  ) {
    errors.push('datasetId mismatch');
  }

  if (!nonEmpty(register?.sourceVersion)) {
    errors.push('sourceVersion is required');
  } else if (register.sourceVersion !== schemaEvidence?.sourceVersion) {
    errors.push('sourceVersion must equal durable schema evidence sourceVersion');
  }

  if (register?.schemaEvidencePath !== SCHEMA_EVIDENCE_PATH) {
    errors.push('schemaEvidencePath mismatch');
  }

  const observations = Array.isArray(register?.observations)
    ? register.observations
    : [];
  const observationIds = new Set(observations.map((item) => item?.observationId));

  for (const required of REQUIRED_OBSERVATIONS) {
    if (!observationIds.has(required)) {
      errors.push(`missing required observation ${required}`);
    }
  }

  for (const item of observations) {
    if (!nonEmpty(item?.source) || !item.source.startsWith('https://')) {
      errors.push(`${item?.observationId ?? 'observation'}: HTTPS source required`);
    }
    if (!nonEmpty(item?.observedValue)) {
      errors.push(`${item?.observationId ?? 'observation'}: observedValue required`);
    }
  }

  const canonical = observations.find(
    (item) => item?.observationId === 'CANONICAL_ETALAB_PAGE',
  );
  if (canonical?.versionConclusion !== '2.0') {
    errors.push('canonical Etalab page must preserve observed 2.0 version');
  }

  const legacy = observations.find(
    (item) => item?.observationId === 'LEGACY_PDF_IDENTIFICATION',
  );
  if (legacy?.versionConclusion !== '1.0') {
    errors.push('legacy PDF observation must preserve observed 1.0 identification');
  }

  const request = register?.clarificationRequest;
  if (request?.messageSent === true) {
    if (!nonEmpty(request?.messageEvidenceRef)) {
      errors.push('messageSent true requires messageEvidenceRef');
    }
  } else if (request?.messageSent !== false) {
    errors.push('messageSent must be a boolean');
  } else if (request?.messageEvidenceRef != null) {
    errors.push('unsent clarification must not carry messageEvidenceRef');
  }
  if (!nonEmpty(request?.targetAuthority)) {
    errors.push('targetAuthority is required');
  }
  if (
    !Array.isArray(request?.requiredAnswers) ||
    request.requiredAnswers.length < 4 ||
    request.requiredAnswers.some((value) => !nonEmpty(value))
  ) {
    errors.push('at least four bounded clarification questions are required');
  }

  if (register?.runtimeRightsDisposition === 'GO') {
    if (register?.reconciliationState !== 'CONFIRMED') {
      errors.push('GO requires reconciliationState CONFIRMED');
    }
    if (register?.releaseAllowed !== true) {
      errors.push('GO requires releaseAllowed true');
    }

    const confirmation = register?.authoritativeConfirmation;
    if (!confirmation) {
      errors.push('GO requires authoritativeConfirmation');
    } else {
      if (confirmation.authorityType !== 'PRIMARY_PUBLISHER_CONFIRMATION') {
        errors.push('GO requires PRIMARY_PUBLISHER_CONFIRMATION');
      }
      for (const field of [
        'evidenceRef',
        'confirmedAt',
        'confirmedByRole',
        'applicableLicenceVersion',
        'attributionRequirement',
        'appliesToSourceVersion',
      ]) {
        if (!nonEmpty(confirmation[field])) {
          errors.push(`GO confirmation missing ${field}`);
        }
      }
      if (confirmation.appliesToSourceVersion !== register.sourceVersion) {
        errors.push('GO confirmation must bind the exact sourceVersion');
      }
      if (!['1.0', '2.0'].includes(confirmation.applicableLicenceVersion)) {
        errors.push('GO confirmation licence version must be 1.0 or 2.0');
      }
    }
  } else {
    if (register?.runtimeRightsDisposition !== 'HOLD') {
      errors.push('runtimeRightsDisposition must be HOLD or GO');
    }
    if (register?.releaseAllowed !== false) {
      errors.push('HOLD requires releaseAllowed false');
    }
    if (register?.reconciliationState !== 'HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED') {
      errors.push('current HOLD must remain explicit');
    }
    if (register?.authoritativeConfirmation !== null) {
      errors.push('HOLD must not carry an authoritative confirmation');
    }
  }

  return errors;
}

export function extractBretagneRnrRuntimeDescriptorSource(runtimeSourceText) {
  const datasetId = 'reserves-naturelles-regionales-de-bretagne';
  const marker = `datasetId: '${datasetId}'`;
  const markerIndex = runtimeSourceText.indexOf(marker);
  if (markerIndex < 0) return null;

  const start = runtimeSourceText.lastIndexOf('{', markerIndex);
  if (start < 0) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = start; index < runtimeSourceText.length; index += 1) {
    const char = runtimeSourceText[index];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return runtimeSourceText.slice(start, index + 1);
    }
  }

  return null;
}

export function validateBretagneRnrRuntimeBoundary(register, runtimeSourceText) {
  const errors = [];
  const descriptor = extractBretagneRnrRuntimeDescriptorSource(runtimeSourceText);

  if (descriptor == null) {
    errors.push('runtime Bretagne RNR descriptor is missing');
    return errors;
  }

  const sourceVersionMatch = descriptor.match(
    /immutableSourceVersion:\s*['"]([^'"]+)['"]/,
  );
  if (
    sourceVersionMatch &&
    sourceVersionMatch[1] !== register?.sourceVersion
  ) {
    errors.push(
      'runtime rights evidence sourceVersion must equal clarification sourceVersion',
    );
  }

  if (
    register?.reconciliationState ===
    'HOLD_AUTHORITATIVE_CLARIFICATION_REQUIRED'
  ) {
    if (/disposition:\s*['"]GO['"]/.test(descriptor)) {
      errors.push(
        'runtime rights GO is forbidden while licence clarification is HOLD',
      );
    }
    if (/status:\s*['"]RELEASE_READY['"]/.test(descriptor)) {
      errors.push(
        'runtime RELEASE_READY is forbidden while licence clarification is HOLD',
      );
    }
  }

  return errors;
}

export async function validateBretagneRnrLicenceClarificationFiles(
  registerPath = REGISTER_PATH,
  schemaEvidencePath = SCHEMA_EVIDENCE_PATH,
  runtimeDatasetPath = RUNTIME_DATASET_PATH,
) {
  const [registerRaw, schemaRaw, runtimeSourceText] = await Promise.all([
    readFile(registerPath, 'utf8'),
    readFile(schemaEvidencePath, 'utf8'),
    readFile(runtimeDatasetPath, 'utf8'),
  ]);

  const register = JSON.parse(registerRaw);
  return [
    ...validateBretagneRnrLicenceClarification(
      register,
      JSON.parse(schemaRaw),
    ),
    ...validateBretagneRnrRuntimeBoundary(register, runtimeSourceText),
  ];
}

async function main() {
  const errors = await validateBretagneRnrLicenceClarificationFiles();
  if (errors.length > 0) {
    console.error('Bretagne RNR licence clarification gate FAILED:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    'Bretagne RNR licence clarification gate PASS: conflicting version evidence remains fail-closed until primary-publisher confirmation.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
