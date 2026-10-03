import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BreizDocument, BreizDocumentChunk } from '../breizDocument.schema';
import { chunkVerifiedBreizPublicDocument } from '../chunkDocuments';
import { promoteBreizDocumentForPublicAnswer } from '../authorityPromotion';
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
      allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
      reviewedAt: '2026-09-22T10:00:00.000Z',
      reviewerRole: 'TEST_REVIEWER',
      recheckAt: '2026-10-22T10:00:00.000Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
    ...overrides,
  };
}

function neutralDocument(): BreizDocument {
  return {
    id: 'fixture-lorient',
    title: 'Boucle du port de Lorient',
    source_name: 'Local review candidate',
    source_url: null,
    license: 'Pending controlled review',
    territory: 'Bretagne',
    region: 'Bretagne',
    department: 'Morbihan',
    commune: 'Lorient',
    theme: 'local_knowledge',
    tags: ['lorient', 'balade'],
    summary: 'Boucle plate le long du port de Lorient.',
    content: 'Boucle plate le long du port de Lorient.',
    reliability_level: 'unknown',
    last_checked_at: '2026-09-23T09:00:00.000Z',
    allowed_usage: 'retrieval_only',
  };
}

async function controlledDocument(): Promise<BreizDocument> {
  const reviewed = source();
  const result = await promoteBreizDocumentForPublicAnswer(
    neutralDocument(),
    reviewed.id,
    NOW,
    () => reviewed,
  );
  assert.equal(result.ready, true);
  if (!result.ready) throw new Error(result.reason);
  return result.document;
}

async function firstChunk(): Promise<BreizDocumentChunk> {
  const chunks = await chunkVerifiedBreizPublicDocument(
    await controlledDocument(),
    { maxWords: 40, overlapWords: 5 },
  );
  assert.equal(chunks.length > 0, true);
  return chunks[0]!;
}

function withMetadata(
  chunk: BreizDocumentChunk,
  overrides: Partial<BreizDocumentChunk['metadata']>,
): BreizDocumentChunk {
  return {
    ...chunk,
    metadata: {
      ...chunk.metadata,
      ...overrides,
    },
  };
}

test('exact reviewed authority binding is eligible', async () => {
  const chunk = await firstChunk();
  const verdict = evaluateBreizChunkReleaseAuthority(chunk, source(), NOW);
  assert.equal(verdict.authorized, true);
  assert.deepEqual(verdict.blockers, []);
});

test('content freshness is required independently from valid rights', async () => {
  const chunk = await firstChunk();

  const boundaryVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { last_checked_at: '2026-09-22T10:00:00.000Z' }),
    source(),
    NOW,
  );
  assert.equal(boundaryVerdict.authorized, true);
  assert.equal(boundaryVerdict.blockers.includes('CONTENT_STALE'), false);

  const staleVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { last_checked_at: '2026-09-22T09:59:59.999Z' }),
    source(),
    NOW,
  );
  assert.equal(staleVerdict.authorized, false);
  assert.ok(staleVerdict.blockers.includes('CONTENT_STALE'));

  const futureVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { last_checked_at: '2026-09-23T10:00:00.001Z' }),
    source(),
    NOW,
  );
  assert.equal(futureVerdict.authorized, false);
  assert.ok(futureVerdict.blockers.includes('CONTENT_LAST_CHECK_FUTURE'));

  const unreadableVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { last_checked_at: 'not-a-date' }),
    source(),
    NOW,
  );
  assert.equal(unreadableVerdict.authorized, false);
  assert.ok(unreadableVerdict.blockers.includes('CONTENT_LAST_CHECK_UNREADABLE'));
});

test('ingestion-only rights cannot authorize a public answer', async () => {
  const chunk = await firstChunk();
  const ingestionOnly = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      allowedProductUses: ['INGESTION'],
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(chunk, ingestionOnly, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('REGISTRY_RELEASE_NOT_READY'));
});

test('silent product-use mutation under the same revision fails closed', async () => {
  const chunk = await firstChunk();
  const mutated = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      allowedProductUses: ['PUBLIC_ANSWER_WITH_SOURCE', 'INGESTION'],
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(chunk, mutated, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('PRODUCT_USE_SCOPE_MISMATCH'));
});

test('silent permitted-use summary mutation under the same revision fails closed', async () => {
  const chunk = await firstChunk();
  const mutated = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      permittedUseSummary: 'Different scope text under same revision',
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(chunk, mutated, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('PERMITTED_USE_SUMMARY_MISMATCH'));
});

test('old chunk cannot inherit a later GO authority revision', async () => {
  const chunk = await firstChunk();
  const laterSource = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      authorityRevision: 'review-002',
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(chunk, laterSource, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('AUTHORITY_REVISION_MISMATCH'));
});

test('immutable source-version mismatch fails closed', async () => {
  const chunk = await firstChunk();
  const laterSource = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      immutableSourceVersion: 'dataset-v2',
    },
  });

  const verdict = evaluateBreizChunkReleaseAuthority(chunk, laterSource, NOW);
  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('IMMUTABLE_VERSION_MISMATCH'));
});

test('matching registry id cannot authorize mismatched source identity', async () => {
  const chunk = await firstChunk();
  const verdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { source_name: 'Unrelated fixture' }),
    source(),
    NOW,
  );

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('SOURCE_NAME_MISMATCH'));
});

test('mismatched source URL or licence fails closed', async () => {
  const chunk = await firstChunk();

  const urlVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { source_url: 'https://example.invalid/other' }),
    source(),
    NOW,
  );
  const licenceVerdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { license: 'Different licence' }),
    source(),
    NOW,
  );

  assert.equal(urlVerdict.authorized, false);
  assert.ok(urlVerdict.blockers.includes('SOURCE_URL_MISMATCH'));
  assert.equal(licenceVerdict.authorized, false);
  assert.ok(licenceVerdict.blockers.includes('SOURCE_LICENCE_MISMATCH'));
});

test('missing immutable binding fails closed even with public flags', async () => {
  const chunk = await firstChunk();
  const verdict = evaluateBreizChunkReleaseAuthority(
    withMetadata(chunk, { source_authority_binding: null }),
    source(),
    NOW,
  );

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('AUTHORITY_BINDING_MISSING'));
});

test('missing chunk digest fails closed before cryptographic retrieval', async () => {
  const chunk = await firstChunk();
  const verdict = evaluateBreizChunkReleaseAuthority(
    { ...chunk, content_sha256: null },
    source(),
    NOW,
  );

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('CHUNK_CONTENT_DIGEST_MISSING'));
});

test('expired reviewed authority cannot authorize a still-bound chunk', async () => {
  const chunk = await firstChunk();
  const expired = source({
    rightsEvidence: {
      ...source().rightsEvidence!,
      recheckAt: '2026-09-23T09:59:59.000Z',
    },
  });
  const verdict = evaluateBreizChunkReleaseAuthority(chunk, expired, NOW);

  assert.equal(verdict.authorized, false);
  assert.ok(verdict.blockers.includes('REGISTRY_RELEASE_NOT_READY'));
});
