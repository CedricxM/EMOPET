import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const activeSectionUrl = new URL('../app/profil/DonneesSection.tsx', import.meta.url);
const unavailableModalUrl = new URL('../components/donnees/privacy-erasure-modal.tsx', import.meta.url);
const genericModalsUrl = new URL('../components/donnees/modals.tsx', import.meta.url);
const smokeChecklistUrl = new URL('../SMOKE.md', import.meta.url);

const unsupportedNumericDeadline = /\b(?:sous|dans)\s+\d+\s+(?:jour|jours|semaine|semaines|mois|an|ans|année|années)\b/i;
const destructiveRequest = /fetch\s*\(|method\s*:\s*['"]DELETE['"]/i;

test('PRIV-UI-01: active erasure flow is the fail-closed unavailable modal', async () => {
  const source = await readFile(activeSectionUrl, 'utf8');

  assert.match(source, /components\/donnees\/privacy-erasure-modal/);
  assert.match(source, /PrivacyErasureUnavailableModal/);
  assert.doesNotMatch(source, /\.DeleteModal\b/);
  assert.doesNotMatch(source, /\.DeletedToastModal\b/);
  assert.doesNotMatch(source, /ErasureSimulationModals/);
  assert.doesNotMatch(source, destructiveRequest);
});

test('PRIV-UI-01: unavailable erasure copy makes no deletion or timing claim', async () => {
  const source = await readFile(unavailableModalUrl, 'utf8');

  assert.match(source, /PRIVACY_ERASURE_GATE\s*=\s*'G-PRIV-ERASURE'/);
  assert.match(source, /Effacement non disponible/);
  assert.match(source, /Aucune donnée n&apos;a été supprimée/);
  assert.match(source, /ne lance aucune opération\s+d&apos;effacement/);
  assert.match(source, /Aucun délai d&apos;effacement\s+n&apos;est annoncé/);
  assert.doesNotMatch(source, unsupportedNumericDeadline);
  assert.doesNotMatch(source, destructiveRequest);
});

test('PRIV-UI-01: stale destructive modals cannot be reactivated from generic modals', async () => {
  const source = await readFile(genericModalsUrl, 'utf8');

  assert.doesNotMatch(source, /export function DeleteModal/);
  assert.doesNotMatch(source, /export function DeletedToastModal/);
  assert.doesNotMatch(source, /sous\s+30\s+jours/i);
  assert.doesNotMatch(source, /supprime\s+(?:dÃ©finitivement|définitivement)/i);
});

test('PRIV-UI-01: manual QA describes the actual fail-closed erasure surface', async () => {
  const source = await readFile(smokeChecklistUrl, 'utf8');

  assert.match(source, /Effacement non disponible/);
  assert.match(source, /Aucune donnée n'a été supprimée/);
  assert.match(source, /ne lance aucune opération d'effacement/);
  assert.match(source, /Aucun délai d'effacement/i);
  assert.doesNotMatch(source, /Supprimer définitivement/i);
  assert.doesNotMatch(source, /Une fois supprimé/i);
  assert.doesNotMatch(source, /Suppression simulée/i);
  assert.doesNotMatch(source, unsupportedNumericDeadline);
});
