import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');

function extractInterface(source, name) {
  const marker = `export interface ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);

  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `missing opening brace for ${name}`);

  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  assert.fail(`unterminated interface ${name}`);
}

function extractRouteBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing route marker ${marker}`);
  const next = source.indexOf("\nsensors.", start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

const [
  inferenceSource,
  publicApiSource,
  physicalProjectionSource,
  sensorsRouteSource,
  publicContractSource,
] = await Promise.all([
  read('packages/shared/src/types/inference.ts'),
  read('packages/shared/src/types/eli-api.ts'),
  read('backend/api/services/eli-runtime/physical-movement-observation.ts'),
  read('backend/api/routes/sensors.ts'),
  read('docs/control/ELI_API_PUBLIC_PROJECTION_CONTRACT_2026-09-25.md'),
]);

const forbiddenPublicFields =
  /\b(?:eli|arousal|valence|load|active_vetoes|contributing_features|sensorReliability|wellbeing|stress|emotion|vetoes)\s*:/i;

test('internal InferenceResult remains internal-capable while public generic AVAILABLE stays uninhabitable', () => {
  assert.match(inferenceSource, /export interface InferenceResult/);
  assert.match(inferenceSource, /eli:\s*ELIState/);
  assert.match(inferenceSource, /active_vetoes:\s*string\[\]/);

  assert.match(
    publicApiSource,
    /export type EliAuthorizedPublicObservation\s*=\s*never\s*;/,
  );
  assert.match(publicContractSource, /VALENCE_PUBLICATION = FORBIDDEN/);
  assert.match(publicContractSource, /LOAD\/GLOBAL_ELI_PUBLICATION = NOT AUTHORIZED/);
});

test('public ELI DTOs contain no latent/internal affective fields', () => {
  for (const name of [
    'EliApiCommon',
    'EliApiNotImplemented',
    'EliApiUnavailable',
    'EliApiNoneFound',
    'EliPublicObservationProvenance',
    'EliPublicObservationBase',
    'EliApiAvailable',
    'EliPhysicalMovementObservation',
  ]) {
    const body = extractInterface(publicApiSource, name);
    assert.doesNotMatch(body, forbiddenPublicFields, name);
  }
});

test('physical movement projection is a dedicated public DTO, not internal ELI serialization', () => {
  assert.match(
    physicalProjectionSource,
    /import type \{ EliPhysicalMovementApiResponse \} from '@emopet\/shared'/,
  );
  assert.doesNotMatch(
    physicalProjectionSource,
    /\b(?:InferenceResult|ELIState|eliStates)\b/,
  );
  assert.match(
    physicalProjectionSource,
    /interpretationAuthority:\s*'PHYSICAL_MOVEMENT_VARIABILITY_ONLY'/,
  );
  assert.match(
    physicalProjectionSource,
    /affectiveInterpretationAuthorized:\s*false/,
  );
  assert.match(physicalProjectionSource, /latentStatePublished:\s*false/);
});

test('generic ELI routes remain fail-honest 501 boundaries', () => {
  const latest = extractRouteBlock(
    sensorsRouteSource,
    "sensors.get('/eli/:dogId',",
  );
  const history = extractRouteBlock(
    sensorsRouteSource,
    "sensors.get('/eli/:dogId/history',",
  );

  for (const block of [latest, history]) {
    assert.match(block, /eli_runtime_not_implemented/);
    assert.match(block, /501/);
    assert.doesNotMatch(
      block,
      /\b(?:InferenceResult|ELIState|eliStates|projectLatestPhysicalMovementObservation)\b/,
    );
  }
});

test('product routes cannot serialize internal ELI state directly; Owner export must use its projector', async () => {
  const routesDir = path.join(root, 'backend/api/routes');
  const files = (await readdir(routesDir)).filter((name) => name.endsWith('.ts'));

  for (const file of files) {
    const source = await readFile(path.join(routesDir, file), 'utf8');
    assert.doesNotMatch(
      source,
      /import[^;]*(?:InferenceResult|ELIState)[^;]*from/,
      `${file}: route imports internal ELI contract directly`,
    );

    if (!/\beliStates\b/.test(source)) continue;

    assert.equal(
      file,
      'data-export.ts',
      `${file}: only the bounded Owner export may read persisted eli_states`,
    );
    assert.match(source, /toOwnerAuthorizedEliExport/);
    assert.match(source, /eliRows\.map\(toOwnerAuthorizedEliExport\)/);
    assert.doesNotMatch(
      source,
      /inferred:\s*eliRows(?:\s*[,}])/,
      'data-export.ts: persisted ELI rows must not be serialized directly',
    );
  }
});
