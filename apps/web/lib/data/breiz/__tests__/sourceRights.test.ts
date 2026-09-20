/**
 * Contrôle fail-closed des droits de source Breiz — gate DATA-LIC-G6 de #116.
 *
 * #116 constate que le registre Breiz décrit des droits sans les appliquer :
 * « eight have `license: null` » et « enabled catalogue sources still require
 * per-dataset/per-item licence receipts and enforcement evidence ». G6 exige
 * précisément « a fail-closed control when evidence is missing ».
 *
 * Avant ce correctif, trois décisions se prenaient par omission :
 *
 *   1. `canStoreFullText` ne lisait jamais `license` ;
 *   2. `isFresh` rendait `true` quand aucune règle de re-contrôle n'existait ;
 *   3. l'ingestion remplaçait une licence absente par une phrase, ce qui
 *      neutralisait la règle `license is required` du schéma.
 *
 * Les tests ci-dessous couvrent les trois. Ils constatent la présence d'une
 * preuve, jamais sa suffisance : aucune de ces assertions ne vaut avis
 * juridique et #116 reste ouverte.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ingestBreizDocuments } from '../ingestDocuments';
import type { BreizSourceProvenance } from '../sourceProvenance';
import { evaluateFreshness, isFresh } from '../sourceProvenance';
import type { BreizSourceDescriptor } from '../sourceRegistry';
import {
  BREIZ_SOURCE_REGISTRY,
  canStoreFullText,
  evaluateBreizSourceRights,
} from '../sourceRegistry';

function source(overrides: Partial<BreizSourceDescriptor> = {}): BreizSourceDescriptor {
  return {
    id: 'fixture',
    name: 'Fixture',
    publisher: 'Fixture publisher',
    canonicalUrl: 'https://example.invalid/',
    territory: 'Bretagne',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    enabled: true,
    notes: '',
    ...overrides,
  };
}

/* ---------- 1. le registre lui-même ---------- */

test('aucune source du registre n’est ingérable en l’état', () => {
  // Constat, pas objectif : les neuf entrées manquent toutes d'au moins une
  // preuve. Si ce test devient rouge, c'est qu'une source a reçu son reçu —
  // vérifier alors que la preuve est réelle avant de mettre le test à jour.
  const permitted = BREIZ_SOURCE_REGISTRY
    .filter((entry) => evaluateBreizSourceRights(entry).ingestionPermitted)
    .map((entry) => entry.id);
  assert.deepEqual(permitted, [], `sources devenues ingérables : ${permitted.join(', ')}`);
});

test('les deux sources activées sont bloquées faute de reçu de licence', () => {
  const enabled = BREIZ_SOURCE_REGISTRY.filter((entry) => entry.enabled);
  assert.equal(enabled.length, 2, 'le registre devrait compter deux sources activées');
  for (const entry of enabled) {
    const verdict = evaluateBreizSourceRights(entry);
    assert.equal(verdict.ingestionPermitted, false, entry.id);
    assert.ok(
      verdict.blockers.includes('NO_LICENCE_RECEIPT'),
      `${entry.id} : blocage attendu NO_LICENCE_RECEIPT, obtenu ${verdict.blockers.join(', ')}`,
    );
  }
});

/* ---------- 2. le contrôle, cas par cas ---------- */

test('une source complète est ingérable', () => {
  const verdict = evaluateBreizSourceRights(source());
  assert.deepEqual(verdict.blockers, []);
  assert.equal(verdict.ingestionPermitted, true);
});

test('licence absente ou vide → bloqué', () => {
  for (const license of [null, '', '   ']) {
    const verdict = evaluateBreizSourceRights(source({ license }));
    assert.ok(verdict.blockers.includes('NO_LICENCE_RECEIPT'), `license=${JSON.stringify(license)}`);
    assert.equal(verdict.ingestionPermitted, false);
  }
});

test('absence de règle de re-contrôle → bloqué', () => {
  const verdict = evaluateBreizSourceRights(source({ freshnessHours: null }));
  assert.ok(verdict.blockers.includes('NO_RECHECK_RULE'));
  assert.equal(verdict.ingestionPermitted, false);
});

test('accord partenaire requis et source désactivée → bloqués, et cumulables', () => {
  const verdict = evaluateBreizSourceRights(
    source({ enabled: false, license: null, usagePolicy: ['PARTNER_PERMISSION_REQUIRED'] }),
  );
  assert.deepEqual(
    verdict.blockers.slice().sort(),
    ['NO_LICENCE_RECEIPT', 'PARTNER_PERMISSION_REQUIRED', 'SOURCE_DISABLED'].sort(),
  );
});

/* ---------- 3. texte intégral ---------- */

test('texte intégral autorisé sans licence → refusé', () => {
  // C'est le défaut que l'ancienne implémentation portait : elle ne consultait
  // que `usagePolicy`. Aucune entrée du registre ne porte FULL_TEXT_ALLOWED
  // aujourd'hui, donc le défaut n'était pas encore atteignable.
  const permissive = source({ license: null, usagePolicy: ['FULL_TEXT_ALLOWED'] });
  assert.equal(canStoreFullText(permissive), false);
  assert.equal(evaluateBreizSourceRights(permissive).fullTextPermitted, false);
});

test('texte intégral avec licence et sans clause bloquante → autorisé', () => {
  assert.equal(canStoreFullText(source({ usagePolicy: ['FULL_TEXT_ALLOWED'] })), true);
});

test('NO_DERIVATIVES interdit le texte intégral sans bloquer l’ingestion', () => {
  const noDerivatives = source({ usagePolicy: ['FULL_TEXT_ALLOWED', 'NO_DERIVATIVES'] });
  assert.equal(canStoreFullText(noDerivatives), false);
  assert.equal(evaluateBreizSourceRights(noDerivatives).ingestionPermitted, true);
});

/* ---------- 4. fraîcheur ---------- */

function provenance(overrides: Partial<BreizSourceProvenance> = {}): BreizSourceProvenance {
  return {
    sourceId: 'fixture',
    sourceName: 'Fixture',
    canonicalUrl: 'https://example.invalid/',
    publisher: 'Fixture publisher',
    retrievedAt: '2026-09-20T00:00:00.000Z',
    sourceUpdatedAt: null,
    territory: 'Bretagne',
    contentType: 'application/json',
    license: 'Licence Ouverte 2.0',
    allowedUse: ['ATTRIBUTION_REQUIRED'],
    attribution: 'Fixture',
    language: 'fr',
    checksumSha256: null,
    freshnessPolicyHours: 24,
    authority: 'official',
    ...overrides,
  };
}

const AT = Date.parse('2026-09-20T06:00:00.000Z');

test('absence de règle de fraîcheur ≠ à jour', () => {
  const noPolicy = provenance({ freshnessPolicyHours: null });
  assert.equal(evaluateFreshness(noPolicy, AT), 'no_recheck_rule');
  // L'ancienne implémentation rendait `true` ici.
  assert.equal(isFresh(noPolicy, AT), false);
});

test('date de récupération illisible → distinguée de « périmé »', () => {
  const broken = provenance({ retrievedAt: 'pas une date' });
  assert.equal(evaluateFreshness(broken, AT), 'unreadable_retrieval_date');
  assert.equal(isFresh(broken, AT), false);
});

test('fenêtre respectée → à jour ; dépassée → périmé', () => {
  assert.equal(evaluateFreshness(provenance(), AT), 'fresh');
  assert.equal(isFresh(provenance(), AT), true);

  const old = provenance({ retrievedAt: '2026-09-18T00:00:00.000Z' });
  assert.equal(evaluateFreshness(old, AT), 'stale');
  assert.equal(isFresh(old, AT), false);
});

/* ---------- 5. ingestion : la licence n’est plus fabriquée ---------- */

test('markdown sans reçu de licence → rejeté, jamais complété', () => {
  const result = ingestBreizDocuments([
    { filename: 'lorient.md', content: '# Note\nContenu local.' },
  ]);
  assert.equal(result.documents.length, 0);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.rejected[0]!.errors, ['license is required']);
});

test('la phrase fabriquée d’origine n’apparaît plus nulle part', () => {
  const result = ingestBreizDocuments([
    { filename: 'a.md', content: '# A\nTexte.' },
    { filename: 'b.md', content: '# B\nTexte.', license: 'CC-BY-4.0' },
  ]);
  const licences = result.documents.map((document) => document.license);
  assert.deepEqual(licences, ['CC-BY-4.0']);
  for (const licence of licences) {
    assert.ok(!licence.toLowerCase().includes('review required'), `licence fabriquée : ${licence}`);
  }
});

test('la licence portée par l’enregistrement prime sur celle du fichier', () => {
  const result = ingestBreizDocuments([
    {
      filename: 'data.json',
      content: JSON.stringify({ title: 'T', content: 'C', license: 'ODbL-1.0' }),
      license: 'CC-BY-4.0',
    },
  ]);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.documents[0]!.license, 'ODbL-1.0');
});
