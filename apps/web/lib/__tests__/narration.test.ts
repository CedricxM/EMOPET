/**
 * Tests narration (Partie C) — garde-fous : non médical, pas d'émotion prêtée au
 * chien, une SEULE forme d'implication, registre verrouillé pour la donnée ELI,
 * VERIFIED uniquement (sinon honnêteté).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ELI_DEMO_PREFIX,
  isAuthoritativeEliProvenance,
  lockedEliStatement,
  narrateBreedStory,
  narrateCoatConfirmation,
  narrateContextualObservation,
  narrateSignupBreedIntro,
} from '../narration';
import type { EliStatementProvenance } from '../narration';
import type { Breed } from '../breeds';
import { interpretWithContext } from '../eli/breed-aware-interpretation';

/** Provenance actuelle du web : aucun producteur canonique n'existe (#118 G1/G5). */
const DEMO_PROVENANCE: EliStatementProvenance = {
  classification: 'DEMO_MOCK_ONLY',
  authoritative: false,
  matTagObservationSource: false,
  backendInferenceSource: false,
};

/** Fixture d'une source réelle — n'existe pas encore dans le dépôt. */
const MAT_TAG_PROVENANCE: EliStatementProvenance = {
  classification: 'MAT_TAG_OBSERVED',
  authoritative: true,
  matTagObservationSource: true,
  backendInferenceSource: false,
};

const MEDICAL = ['mala' + 'die', 'patholog', 'coup de chaleur', 'déshydrat', 'hyperthermie', 'arthrose', 'diag' + 'nostic'];
const EMOTION = ['heu' + 'reux', 'tri' + 'ste', 'anxieux', 'déprim', ' jo' + 'ie', 'bon' + 'heur'];

const verified: Breed = {
  id: 'fci-1', fciStandardNumber: 1, nameOfficial: 'Berger des Pyrénées', nameFr: 'Berger des Pyrénées',
  fciGroup: '1', countryOfOrigin: 'France', coatTypeDefault: 'long', sizeCategory: 'moyen',
  morphologyNotes: null, source: 'FCI', sourceVersion: '2026-04', verificationStatus: 'VERIFIED',
};
const pending: Breed = { ...verified, id: 'fci-x', verificationStatus: 'PENDING_VERIFIED', coatTypeDefault: null, countryOfOrigin: null };

function clean(s: string) {
  const t = s.toLowerCase();
  for (const w of [...MEDICAL, ...EMOTION]) assert.ok(!t.includes(w), `"${w}" trouvé dans : ${s}`);
}

test('aucun terme médical ni émotionnel dans les narrations', () => {
  for (const n of [narrateSignupBreedIntro('Gus'), narrateCoatConfirmation('Gus', verified), narrateBreedStory('Gus', verified), narrateBreedStory('Gus', pending)]) {
    clean(n.text);
    if (n.hook) clean(n.hook.text);
  }
});

test('une seule forme d’implication par narration (0 ou 1 hook)', () => {
  for (const n of [narrateSignupBreedIntro('Gus'), narrateCoatConfirmation('Gus', verified), narrateBreedStory('Gus', verified)]) {
    assert.ok(n.hook === undefined || typeof n.hook.text === 'string');
  }
});

test('VERIFIED uniquement : race non vérifiée → honnêteté, pas d’invention', () => {
  const n = narrateBreedStory('Gus', pending);
  assert.ok(/invent|vérifiée|préfère/i.test(n.text));
  // n'invente pas de pays/poil
  assert.ok(!/France|poil long/i.test(n.text));
});

test('registre verrouillé : énoncé ELI factuel avec confiance', () => {
  const s = lockedEliStatement('activite', 64, 'DEGRADED', DEMO_PROVENANCE);
  assert.match(s, /Activité/);
  assert.match(s, /64\/100/);
  assert.match(s, /confiance partielle/);
});

test('contextualisation : récit chaleureux + énoncé verrouillé séparés, non médical', () => {
  const interp = interpretWithContext({ value: 58, confidenceState: 'VALID', metric: 'activite', deviation: 'below' }, { furType: 'long', ambientTempC: 26 });
  const n = narrateContextualObservation('Gus', 'activite', 58, 'VALID', interp, DEMO_PROVENANCE);
  clean(n.narrative);
  assert.match(n.narrative, /frais|lève le pied/i);
  assert.match(n.eli, /58\/100/); // la donnée reste dans l'énoncé verrouillé
  clean(n.eli);
});

/* ------------------------------------------------------------------ */
/* Provenance obligatoire — second chemin de publication ELI (#118 G1) */
/* ------------------------------------------------------------------ */

test('provenance non autoritative : l’énoncé est marqué DÉMO, jamais un nombre nu', () => {
  const s = lockedEliStatement('repos', 72, 'VALID', DEMO_PROVENANCE);
  assert.ok(s.startsWith(ELI_DEMO_PREFIX), `énoncé non marqué : ${s}`);
  assert.match(s, /72\/100/);
});

test('une source autoritative doit s’appuyer sur MAT/TAG ou sur le backend', () => {
  // `authoritative: true` seul ne suffit pas : fail-closed.
  assert.equal(isAuthoritativeEliProvenance({ ...DEMO_PROVENANCE, authoritative: true }), false);
  assert.ok(lockedEliStatement('repos', 72, 'VALID', { ...DEMO_PROVENANCE, authoritative: true }).startsWith(ELI_DEMO_PREFIX));

  assert.equal(isAuthoritativeEliProvenance(MAT_TAG_PROVENANCE), true);
  assert.ok(!lockedEliStatement('repos', 72, 'VALID', MAT_TAG_PROVENANCE).startsWith(ELI_DEMO_PREFIX));
});

test('la narration contextualisée transporte la provenance jusqu’à l’affichage', () => {
  const interp = interpretWithContext({ value: 58, confidenceState: 'VALID', metric: 'activite', deviation: 'below' }, { furType: 'long', ambientTempC: 26 });
  const n = narrateContextualObservation('Gus', 'activite', 58, 'VALID', interp, DEMO_PROVENANCE);
  assert.equal(n.authoritative, false);
  assert.equal(n.provenance.classification, 'DEMO_MOCK_ONLY');
  assert.ok(n.eli.startsWith(ELI_DEMO_PREFIX));
});

test('la convention de provenance reste alignée sur celle du tableau de bord (G3)', () => {
  // Même forme que `ELI_WEB_MOCK_PROVENANCE` : une seule convention web.
  for (const key of ['classification', 'authoritative', 'matTagObservationSource', 'backendInferenceSource']) {
    assert.ok(key in DEMO_PROVENANCE, `clé de provenance manquante : ${key}`);
  }
  assert.equal(ELI_DEMO_PREFIX.trim(), 'DÉMO ·');
});
