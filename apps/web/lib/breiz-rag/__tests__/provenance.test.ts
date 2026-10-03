/**
 * Founder decisions D1, D2 and D4 of the Breiz transparency audit (#226, 2026-09-27).
 * See docs/compliance/BREIZ_TRANSPARENCY_AUDIT_2026-09-27.md.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizSourceDescriptor } from '../../data/breiz/sourceRegistry';
import { BREED_DOCS } from '../breeds.generated';
import { STATIC_DOCS } from '../corpus';
import { askBreiz } from '../index';
import { EDITORIAL_LABEL, isServable, sourceLabel, type KnowledgeProvenance } from '../provenance';

const NOW = Date.parse('2026-09-27T12:00:00Z');

const released: BreizSourceDescriptor = {
  id: 'test-territory',
  name: 'Test territory source',
  publisher: 'Test publisher',
  canonicalUrl: 'https://example.org/',
  territory: 'Bretagne',
  accessMode: 'api',
  authority: 'official',
  usagePolicy: ['ATTRIBUTION_REQUIRED'],
  license: 'Licence Ouverte 2.0',
  freshnessHours: 24,
  enabled: true,
  notes: 'test fixture',
  rightsEvidence: {
    authorityRevision: 'rev-1',
    immutableSourceVersion: 'v1',
    receiptPath: 'data/registry/receipts/test.json',
    attributionText: 'Test publisher — Licence Ouverte 2.0',
    permittedUseSummary: 'public answer with attribution',
    allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
    reviewedAt: '2026-09-26T00:00:00Z',
    reviewerRole: 'rights reviewer',
    recheckAt: '2026-10-26T00:00:00Z',
    evidenceState: 'SOURCE_CONFIRMED',
    disposition: 'GO',
  },
};

test('D1: a third-party territorial sheet is served only when the rights registry releases it', () => {
  const registry: KnowledgeProvenance = { kind: 'registry', sourceRegistryId: 'test-territory' };
  const none = () => undefined;
  assert.equal(isServable(registry, NOW, none), false);
  assert.equal(sourceLabel(registry, NOW, none), null);

  const pending = { ...released, rightsEvidence: { ...released.rightsEvidence!, disposition: 'HOLD' as const } };
  assert.equal(isServable(registry, NOW, () => pending), false);

  const ingestionOnly = {
    ...released,
    rightsEvidence: {
      ...released.rightsEvidence!,
      allowedProductUses: ['INGESTION'] as const,
    },
  };
  assert.equal(isServable(registry, NOW, () => ingestionOnly), false);

  assert.equal(isServable(registry, NOW, () => released), true);
  assert.equal(sourceLabel(registry, NOW, () => released), 'Test publisher — Licence Ouverte 2.0');

  // The real catalogue carries no rights evidence yet: an enabled source still fails closed.
  assert.equal(isServable({ kind: 'registry', sourceRegistryId: 'region-bretagne-open-data' }, NOW), false);
});

test('D1: editorial sheets cite only complete references and are labelled as EMOPET editorial', () => {
  const complete = /^[^,()]+, (?:[A-Z]\.\s?)+\(\d{4}\)\. .+\.$/u;
  for (const doc of STATIC_DOCS) {
    assert.equal(doc.provenance.kind, 'editorial', doc.id);
    if (doc.provenance.kind !== 'editorial') continue;
    for (const ref of doc.provenance.references) assert.match(ref, complete, `${doc.id}: ${ref}`);
    assert.ok(sourceLabel(doc.provenance)!.startsWith(EDITORIAL_LABEL), doc.id);
  }
  const retired = /Foster et al\.|Arrêtés municipaux —|Météo-France — climat|BSAVA —|Méthode propriétaire/;
  for (const doc of STATIC_DOCS) assert.doesNotMatch(JSON.stringify(doc.provenance), retired, doc.id);
});

test('D2: the corpus does not repeat product claims no controlled authority confirms', () => {
  const corpus = STATIC_DOCS.map((doc) => `${doc.title} ${doc.text} ${doc.tags.join(' ')}`).join('\n');
  assert.doesNotMatch(corpus, /14 jours/);
  assert.doesNotMatch(corpus, /fusionne les signaux/);
  assert.doesNotMatch(corpus, /Chaque indicateur affiche un niveau de confiance/);
  assert.doesNotMatch(corpus, /jamais partagées/);
});

test('D4: breed sheets present FCI standard text as such, without extraction residue', () => {
  assert.ok(BREED_DOCS.length > 0);
  for (const doc of BREED_DOCS) {
    assert.deepEqual(doc.provenance, { kind: 'dataset', label: 'Profils de races EMOPET (référentiel FCI)' }, doc.id);
    assert.doesNotMatch(doc.text, /observé/, doc.id);
    assert.doesNotMatch(doc.text, /FCI-St|\b\d{3,}\b \d|\p{L}{3,} [b-xz][\s,.]/u, doc.id);
  }
});

test('D1: answers composed from sheets carry the derived provenance label', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('offline'); }) as typeof fetch;
  try {
    const answer = await askBreiz('signaux d’apaisement bâillements');
    assert.equal(answer.sources[0], 'Fiche éditoriale EMOPET · d’après Rugaas, T. (2006). On Talking Terms with Dogs.');
  } finally {
    globalThis.fetch = real;
  }
});
