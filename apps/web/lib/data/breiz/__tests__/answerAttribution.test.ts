import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizDocument } from '../breizDocument.schema';
import { chunkBreizDocuments } from '../chunkDocuments';
import { evaluateBreizChunkReleaseAuthority } from '../breizRetriever';
import type { BreizSourceDescriptor } from '../sourceRegistry';

const NOW = Date.parse('2026-09-23T10:00:00.000Z');

function source(overrides: Partial<BreizSourceDescriptor> = {}): BreizSourceDescriptor {
  return {
    id: 'fixture-source',
    name: 'Fixture source',
    publisher: 'Fixture publisher',
    canonicalUrl: 'https://example.invalid/source',
    territory: 'Bretagne',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    enabled: true,
    notes: '',
    rightsEvidence: {
      authorityRevision: 'review-001',
      immutableSourceVersion: 'dataset-v1',
      receiptPath: 'data/registry/receipts/fixture.json',
      attributionText: 'Fixture publisher',
      permittedUseSummary: 'Test fixture use only',
      reviewedAt: '2026-09-22T10:00:00.000Z',
      reviewerRole: 'TEST_REVIEWER',
      recheckAt: '2026-10-22T10:00:00.000Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
    ...overrides,
  };
}

function document(overrides: Partial<BreizDocument> = {}): BreizDocument {
  return {
    id: 'fixture-lorient',
    title: 'Boucle du port de Lorient',
    source_name: 'Fixture source',
    source_url: 'https://example.invalid/source',
    source_registry_id: 'fixture-source',
    source_authority_binding: {
      source_registry_id: 'fixture-source',
      authority_revision: 'review-001',
      immutable_source_version: 'dataset-v1',
      receipt_path: 'data/registry/receipts/fixture.json',
      source_name: 'Fixture source',
      source_url: 'https://example.invalid/source',
      license: 'Licence Ouverte 2.0',
      attribution_text: 'Fixture publisher',
    },
    license: 'Licence Ouverte 2.0',
    territory: 'Bretagne',
    region: 'Bretagne',
    department: 'Morbihan',
    commune: 'Lorient',
    theme: 'local_knowledge',
    tags: ['lorient', 'balade'],
    summary: 'Boucle plate le long du port de Lorient.',
    content: 'Boucle plate le long du port de Lorient.',
    reliability_level: 'source_verified',
    last_checked_at: '2026-09-23',
    allowed_usage: 'public_answer_with_source',
    ...overrides,
  };
}

function firstChunk(doc: BreizDocument = document()) {
  return chunkBreizDocuments([doc], { maxWords: 40, overlapWords: 5 })[0]!;
}

test('exact reviewed authority binding is eligible', () => {
  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(), source(), NOW);
  assert.equal(verdict.authorized, true);
  assert.deepEqual(verdict.blockers, []);
});

test('old chunk cannot inherit a later GO authority revision', () => {
  const laterSource = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      authorityRevision: 'review-002',
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(), laterSource, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('AUTHORITY_REVISION_MISMATCH'));
});

test('immutable source-version mismatch fails closed', () => {
  const laterSource = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      immutableSourceVersion: 'dataset-v2',
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(), laterSource, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('IMMUTABLE_VERSION_MISMATCH'));
});

test('matching registry id cannot authorize mismatched source identity', () => {
  const mismatched = document({ source_name: 'Unrelated fixture' });
  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(mismatched), source(), NOW);

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('SOURCE_NAME_MISMATCH'));
});

test('mismatched source URL or licence fails closed', () => {
  const badUrl = document({ source_url: 'https://example.invalid/other' });
  const badLicence = document({ license: 'Different licence' });

  const urlVerdict = evaluateBreizChunkReleaseAuthority(firstChunk(badUrl), source(), NOW);
  const licenceVerdict = evaluateBreizChunkReleaseAuthority(firstChunk(badLicence), source(), NOW);

  assert.equal(urlVerdict.authorized, false);
  assert.ok(urlVerdict.blockers.includes('SOURCE_URL_MISMATCH'));
  assert.equal(licenceVerdict.authorized, false);
  assert.ok(licenceVerdict.blockers.includes('SOURCE_LICENCE_MISMATCH'));
});

test('missing immutable binding fails closed even with public flags', () => {
  const unbound = document({ source_authority_binding: null });
  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(unbound), source(), NOW);

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('AUTHORITY_BINDING_MISSING'));
});

test('expired reviewed authority cannot authorize a still-bound chunk', () => {
  const expired = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      recheckAt: '2026-09-23T09:59:59.000Z',
    },
  });
  const verdict = evaluateBreizChunkReleaseAuthority(firstChunk(), expired, NOW);

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('REGISTRY_RELEASE_NOT_READY'));
});
