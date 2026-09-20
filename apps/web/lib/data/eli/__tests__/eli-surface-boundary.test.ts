/**
 * Frontière de disposition ELI-ARCH-G1 (#118) pour `lib/data/eli/`.
 *
 * Ce répertoire n'est pas classable en bloc. Il contient deux moitiés de statut
 * différent, et rien dans le code ne les distinguait :
 *
 *  - CONTRAT  — consommé par du code produit vivant ou décrivant un contrat
 *               capteur/observation destiné à le devenir ;
 *  - DÉMO     — `mockEliPipeline` / `mockSensorEvents`, non autoritatifs.
 *
 * Le barrel `lib/data/index.ts` réexporte les deux à plat : au point d'import,
 * `runMockEliPipeline` et `DogProfile` sont indiscernables. Ces tests verrouillent
 * la frontière que le barrel efface.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import { ELI_DATA_MOCK_PROVENANCE, runMockEliPipeline } from '../mockEliPipeline';
import {
  LOW_QUALITY_MAT_EVENTS,
  MOCK_APP_OBSERVATIONS,
  MOCK_DOG_PROFILE,
  MOCK_MAT_EVENTS,
  MOCK_TAG_EVENTS,
} from '../mockSensorEvents';

/** Modules DÉMO : non autoritatifs, jamais importés par une surface produit. */
const DEMO_MODULES = ['mockEliPipeline', 'mockSensorEvents'];

/** Modules CONTRAT : ils ne doivent jamais dépendre de la moitié démo. */
const CONTRACT_MODULES = [
  'dogProfile.schema.ts',
  'matEvent.schema.ts',
  'tagEvent.schema.ts',
  'appObservation.schema.ts',
  'eliLabels.ts',
  'eliValidation.ts',
];

const eliDir = fileURLToPath(new URL('../', import.meta.url));

function collectSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...collectSources(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function surfaceDir(relative: string): string {
  const dir = fileURLToPath(new URL(relative, import.meta.url));
  // Échoue bruyamment si l'arborescence bouge, plutôt que de passer à vide.
  assert.ok(statSync(dir).isDirectory(), `répertoire introuvable : ${relative}`);
  return dir;
}

/* ------------------------------------------------------------------ */
/* 1. La moitié DÉMO déclare sa provenance sur chaque sortie           */
/* ------------------------------------------------------------------ */

test('la sortie démo déclare une provenance non autoritative, branche valide', () => {
  const output = runMockEliPipeline({
    profile: MOCK_DOG_PROFILE,
    mat_events: MOCK_MAT_EVENTS,
    tag_events: MOCK_TAG_EVENTS,
    app_observations: MOCK_APP_OBSERVATIONS,
  });

  assert.equal(output.status, 'mock_output');
  assert.equal(output.validated, false);
  assert.equal(output.provenance.classification, 'DEMO_MOCK_ONLY');
  assert.equal(output.provenance.authoritative, false);
  assert.equal(output.provenance.matTagObservationSource, false);
  assert.equal(output.provenance.backendInferenceSource, false);
});

test('la sortie démo déclare sa provenance aussi quand elle s’abstient', () => {
  const output = runMockEliPipeline({
    profile: MOCK_DOG_PROFILE,
    mat_events: LOW_QUALITY_MAT_EVENTS,
    tag_events: MOCK_TAG_EVENTS,
    app_observations: MOCK_APP_OBSERVATIONS,
  });

  // L'abstention est un comportement valide : elle reste tracée.
  assert.equal(output.status, 'insufficient_data');
  assert.equal(output.provenance.classification, 'DEMO_MOCK_ONLY');
  assert.equal(output.provenance.authoritative, false);
});

test('la provenance démo emploie le vocabulaire commun aux autres surfaces web', () => {
  // Mêmes clés que `ELI_WEB_MOCK_PROVENANCE` (#280) et `EliStatementProvenance` (#323).
  for (const key of ['classification', 'authoritative', 'matTagObservationSource', 'backendInferenceSource']) {
    assert.ok(key in ELI_DATA_MOCK_PROVENANCE, `clé de provenance manquante : ${key}`);
  }
  assert.equal(ELI_DATA_MOCK_PROVENANCE.sourceModule, 'apps/web/lib/data/eli/mockEliPipeline.ts');
});

/* ------------------------------------------------------------------ */
/* 2. Aucune surface produit ne consomme la moitié DÉMO                */
/* ------------------------------------------------------------------ */

test('aucune page ni composant n’importe la moitié démo de lib/data/eli', () => {
  const sources = [
    ...collectSources(surfaceDir('../../../../app/')),
    ...collectSources(surfaceDir('../../../../components/')),
  ];
  assert.ok(sources.length > 0, 'aucune source produit collectée — le garde serait vide');

  const offenders: string[] = [];
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const demo of DEMO_MODULES) {
      if (text.includes(demo)) offenders.push(`${path.basename(file)} → ${demo}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `surface produit consommant la moitié démo : ${offenders.join(', ')}`,
  );
});

/* ------------------------------------------------------------------ */
/* 3. Le sens de dépendance reste démo → contrat, jamais l’inverse     */
/* ------------------------------------------------------------------ */

test('la moitié contrat ne dépend jamais de la moitié démo', () => {
  const offenders: string[] = [];
  for (const name of CONTRACT_MODULES) {
    const text = readFileSync(path.join(eliDir, name), 'utf8');
    for (const demo of DEMO_MODULES) {
      if (text.includes(`./${demo}`)) offenders.push(`${name} → ${demo}`);
    }
  }

  assert.deepEqual(offenders, [], `inversion du sens de dépendance : ${offenders.join(', ')}`);
});

test('la moitié démo porte sa classification en en-tête, la moitié contrat non', () => {
  const demoHeader = readFileSync(path.join(eliDir, 'mockEliPipeline.ts'), 'utf8');
  assert.match(demoHeader, /DEMO_MOCK_ONLY/);

  // Le contrat ne doit pas hériter de la classification démo par copier-coller.
  for (const name of CONTRACT_MODULES) {
    const text = readFileSync(path.join(eliDir, name), 'utf8');
    assert.doesNotMatch(
      text,
      /classification:\s*'DEMO_MOCK_ONLY'/,
      `${name} porte une classification démo alors qu'il relève du contrat`,
    );
  }
});
