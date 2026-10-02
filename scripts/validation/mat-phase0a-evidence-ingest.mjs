#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contract = JSON.parse(
  await readFile(path.join(root, 'config/validation/mat-phase0a-evidence-contract-v1.json'), 'utf8'),
);

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const nonEmpty = rows.filter((candidate) => candidate.some((value) => value.trim() !== ''));
  if (nonEmpty.length < 2) throw new Error('CSV requires a header and at least one data row');

  const headers = nonEmpty[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  );

  if (headers.some((header) => header === '')) {
    throw new Error('CSV header contains an empty column name');
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV header contains duplicate column names');
  }

  return nonEmpty.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${index + 2} has ${values.length} columns; expected ${headers.length}`,
      );
    }

    const out = { __row: index + 2 };
    headers.forEach((header, columnIndex) => {
      out[header] = values[columnIndex].trim();
    });
    return out;
  });
}

const manifestMap = {
  runId: 'run_id', testArticleId: 'test_article_id',
  matPcbOrAssemblyRevision: 'mat_pcb_or_assembly_revision',
  sourceRevisionOrPackageHash: 'source_revision_or_package_hash',
  bomRevision: 'bom_revision', acquisitionConfiguration: 'acquisition_configuration',
  powerSupplyConfiguration: 'power_supply_configuration',
  sensorChannelMapping: 'sensor_channel_mapping', operator: 'operator',
  startedAt: 'started_at', timezone: 'timezone',
};

export function validateEvidence(manifestRows, sampleRows) {
  const errors = [], warnings = [];
  if (manifestRows.length !== 1) errors.push('manifest must contain exactly one run row');
  const manifest = manifestRows[0] ?? {};

  for (const field of contract.requiredManifestFields) {
    const csvField = manifestMap[field];
    if (!csvField || !manifest[csvField] || manifest[csvField] === 'TBD') {
      errors.push(`manifest missing required field: ${csvField ?? field}`);
    }
  }

  if (manifest.started_at && Number.isNaN(Date.parse(manifest.started_at))) {
    errors.push('manifest started_at is not a valid timestamp');
  }

  const observedState = contract.missingDataPolicy.observedState;
  const allowedStates = new Set([observedState, ...contract.missingDataPolicy.allowedExplicitStates]);
  let observedSamples = 0;
  for (const row of sampleRows) {
    for (const field of contract.requiredSampleFields) {
      if (!(field in row) || row[field] === '' || row[field] === 'TBD') {
        if (!(field === 'value' && contract.missingDataPolicy.allowedExplicitStates.includes(row.data_state))) {
          errors.push(`samples row ${row.__row} missing required field: ${field}`);
        }
      }
    }
    if (row.timestamp && Number.isNaN(Date.parse(row.timestamp))) errors.push(`samples row ${row.__row} invalid timestamp`);
    if (row.run_id && manifest.run_id && row.run_id !== manifest.run_id) errors.push(`samples row ${row.__row} run_id mismatch`);
    if (row.test_article_id && manifest.test_article_id && row.test_article_id !== manifest.test_article_id) errors.push(`samples row ${row.__row} test_article_id mismatch`);
    if (!allowedStates.has(row.data_state)) errors.push(`samples row ${row.__row} unknown data_state: ${row.data_state || '<empty>'}`);
    if (row.data_state === observedState) {
      observedSamples++;
      const rate = Number(row.sample_rate_hz);
      if (!Number.isFinite(rate) || rate <= 0) errors.push(`samples row ${row.__row} sample_rate_hz must be a positive finite number`);
    }
    if (row.data_state !== observedState && row.value === '0') {
      errors.push(`samples row ${row.__row} uses zero for explicit ${row.data_state} data`);
    }
  }

  if (observedSamples === 0) warnings.push('no OBSERVED samples supplied');
  const incomplete = errors.filter((e) => e.includes('missing required field'));
  const structuralErrors = errors.filter((e) => !e.includes('missing required field'));
  const status = structuralErrors.length ? 'REJECTED' : (incomplete.length || observedSamples === 0) ? 'INCOMPLETE' : 'ACCEPTED_FOR_ENGINEERING_ANALYSIS';
  return {
    status,
    errors: [...new Set(structuralErrors)],
    incomplete: [...new Set(incomplete)],
    warnings: [...new Set(warnings)],
    runId: manifest.run_id || null,
    testArticleId: manifest.test_article_id || null,
    counts: { totalSamples: sampleRows.length, observedSamples },
    boundaries: {
      scientificValidation: false,
      incrementalValueDecision: false,
      medicalOrDiagnosticClaim: false,
    },
  };
}

async function main() {
  const [manifestPath, samplesPath] = process.argv.slice(2);
  if (!manifestPath || !samplesPath) {
    console.error('usage: node scripts/validation/mat-phase0a-evidence-ingest.mjs <run_manifest.csv> <raw_samples.csv>');
    process.exitCode = 2; return;
  }
  try {
    const [m, s] = await Promise.all([readFile(manifestPath, 'utf8'), readFile(samplesPath, 'utf8')]);
    const result = validateEvidence(parseCsv(m), parseCsv(s));
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'ACCEPTED_FOR_ENGINEERING_ANALYSIS') process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ status: 'REJECTED', errors: [error.message] }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
