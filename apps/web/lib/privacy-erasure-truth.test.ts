import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const activeSectionUrl = new URL('../app/profil/DonneesSection.tsx', import.meta.url);
const safeModalsUrl = new URL('../components/donnees/ErasureSimulationModals.tsx', import.meta.url);
const legacyModalsUrl = new URL('../components/donnees/modals.tsx', import.meta.url);
const smokeChecklistUrl = new URL('../SMOKE.md', import.meta.url);

test('PRIV-UI-01: active erasure flow imports only the explicit simulation modals', async () => {
  const source = await readFile(activeSectionUrl, 'utf8');

  assert.match(source, /components\/donnees\/ErasureSimulationModals/);
  assert.doesNotMatch(source, /components\/donnees\/modals'\)\.then\(\(m\) => m\.DeleteModal/);
  assert.doesNotMatch(source, /components\/donnees\/modals'\)\.then\(\(m\) => m\.DeletedToastModal/);
});

test('PRIV-UI-01: simulation copy is non-destructive and contains no unsupported numeric deadline', async () => {
  const source = await readFile(safeModalsUrl, 'utf8');

  assert.match(source, /maquette non destructive/);
  assert.match(source, /Aucune donnée n’a été supprimée/);
  assert.match(source, /Aucun délai de suppression n’est annoncé/);
  assert.doesNotMatch(source, /sous\s+30\s+jours/i);
});

test('PRIV-UI-01: stale legacy deletion modals cannot be re-imported from generic modals', async () => {
  const source = await readFile(legacyModalsUrl, 'utf8');

  assert.doesNotMatch(source, /export function DeleteModal/);
  assert.doesNotMatch(source, /export function DeletedToastModal/);
  assert.doesNotMatch(source, /sous\s+30\s+jours/i);
  assert.doesNotMatch(source, /supprime dÃ©finitivement/i);
});

test('PRIV-UI-01: manual QA cannot instruct or claim real deletion', async () => {
  const source = await readFile(smokeChecklistUrl, 'utf8');

  assert.match(source, /Simulation d’effacement/);
  assert.match(source, /Continuer la simulation/);
  assert.match(source, /Simuler la confirmation/);
  assert.match(source, /aucune donnée n’a été supprimée/i);
  assert.doesNotMatch(source, /Supprimer définitivement/i);
  assert.doesNotMatch(source, /Une fois supprimé/i);
});
