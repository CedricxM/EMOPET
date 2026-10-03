import assert from 'node:assert/strict';
import test from 'node:test';

import type { BreizDocument } from '../breizDocument.schema';
import {
  chunkBreizDocuments,
  chunkVerifiedBreizPublicDocument,
  exportChunksForVectorStore,
} from '../chunkDocuments';
import { promoteBreizDocumentForPublicAnswer } from '../authorityPromotion';
import { ingestBreizDocuments } from '../ingestDocuments';
import { MOCK_BREIZ_DOCUMENTS } from '../mockDocuments';
import { MockBreizVectorStore } from '../mockVectorStore';
import {
  createBreizMockStore,
  createBreizVerifiedPublicStore,
  retrieveBreizLocalKnowledge,
  retrieveBreizVerifiedLocalKnowledge,
} from '../breizRetriever';
import type { BreizSourceDescriptor } from '../sourceRegistry';

const NOW = Date.parse('2026-09-23T10:00:00.000Z');

function source(): BreizSourceDescriptor {
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
      permittedUseSummary: 'Fixture public-answer scope',
      allowedProductUses: ['INGESTION', 'PUBLIC_ANSWER_WITH_SOURCE'],
      reviewedAt: '2026-09-22T10:00:00.000Z',
      reviewerRole: 'TEST_REVIEWER',
      recheckAt: '2026-10-22T10:00:00.000Z',
      evidenceState: 'SOURCE_CONFIRMED',
      disposition: 'GO',
    },
  };
}

function neutralControlledCandidate(): BreizDocument {
  return {
    id: 'controlled-fixture',
    title: 'Controlled fixture',
    source_name: 'Pending review',
    source_url: null,
    license: 'Pending review',
    territory: 'Bretagne',
    region: 'Bretagne',
    department: 'Morbihan',
    commune: 'Lorient',
    theme: 'test',
    tags: ['fixture', 'controlled', 'sentinel'],
    summary: 'Controlled fixture.',
    content: 'controlled sentinel content for provenance metadata testing',
    reliability_level: 'unknown',
    last_checked_at: '2026-09-23T09:00:00.000Z',
    allowed_usage: 'retrieval_only',
  };
}

async function controlledDocument(): Promise<BreizDocument> {
  const reviewed = source();
  const result = await promoteBreizDocumentForPublicAnswer(
    neutralControlledCandidate(),
    reviewed.id,
    NOW,
    () => reviewed,
  );
  assert.equal(result.ready, true);
  if (!result.ready) throw new Error(result.reason);
  return result.document;
}

test('Breiz ingestion parses markdown and preserves explicit licence evidence', () => {
  const result = ingestBreizDocuments([
    {
      filename: 'lorient.md',
      content: '# Lorient local note\nFlat harbor loops and local route notes.',
      license: 'Licence Ouverte 2.0',
    },
  ]);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.documents[0]!.title, 'Lorient local note');
  assert.equal(result.documents[0]!.region, 'Bretagne');
  assert.equal(result.documents[0]!.license, 'Licence Ouverte 2.0');
});

test('local ingestion cannot self-promote public or reviewed source authority', () => {
  const result = ingestBreizDocuments([
    {
      filename: 'self-authorized.json',
      content: JSON.stringify({
        id: 'self-authorized',
        title: 'Self authorization sentinel',
        source_name: 'Unreviewed local payload',
        source_url: 'https://example.invalid/unreviewed',
        source_registry_id: 'region-bretagne-open-data',
        source_authority_binding: {
          source_registry_id: 'region-bretagne-open-data',
          authority_revision: 'invented-review',
          immutable_source_version: 'invented-version',
          receipt_path: 'invented-receipt.json',
          source_name: 'Open data Région Bretagne',
          source_url: 'https://data.bretagne.bzh/',
          license: 'Licence Ouverte 2.0',
          attribution_text: 'invented',
          document_payload_sha256: 'a'.repeat(64),
        },
        license: 'Licence Ouverte 2.0',
        content: 'sentinel-rights-bypass',
        reliability_level: 'source_verified',
        allowed_usage: 'public_answer_with_source',
        last_checked_at: '2026-09-23',
      }),
    },
  ]);

  assert.equal(result.rejected.length, 0);
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0]!.allowed_usage, 'retrieval_only');
  assert.equal(result.documents[0]!.reliability_level, 'unknown');
  assert.equal(result.documents[0]!.source_registry_id, undefined);
  assert.equal(result.documents[0]!.source_authority_binding, undefined);

  const answer = retrieveBreizLocalKnowledge(
    'sentinel-rights-bypass',
    createBreizMockStore(result.documents),
  );
  assert.equal(answer.status, 'not_enough_information');
});

test('sync chunking refuses authority-bound public documents', async () => {
  const document = await controlledDocument();
  assert.deepEqual(chunkBreizDocuments([document]), []);
});

test('verified chunking refuses a document mutated after promotion', async () => {
  const document = await controlledDocument();
  const mutated = {
    ...document,
    content: document.content + ' tampered before chunking',
  };

  const chunks = await chunkVerifiedBreizPublicDocument(mutated, {
    maxWords: 40,
    overlapWords: 5,
  });
  assert.deepEqual(chunks, []);
});

test('verified vector export preserves authority and content digests', async () => {
  const chunks = await chunkVerifiedBreizPublicDocument(
    await controlledDocument(),
    { maxWords: 40, overlapWords: 5 },
  );
  assert.equal(chunks.length > 0, true);
  const exported = exportChunksForVectorStore(chunks);

  assert.equal(exported[0]!.metadata.source_registry_id, 'fixture-source');
  assert.equal(exported[0]!.metadata.source_authority_revision, 'review-001');
  assert.equal(exported[0]!.metadata.source_immutable_version, 'dataset-v1');
  assert.equal(exported[0]!.metadata.source_receipt_path, 'data/registry/receipts/fixture.json');
  assert.equal(exported[0]!.metadata.source_attribution_text, 'Fixture publisher');
  assert.equal(exported[0]!.metadata.source_permitted_use_summary, 'Fixture public-answer scope');
  assert.deepEqual(exported[0]!.metadata.source_allowed_product_uses, [
    'INGESTION',
    'PUBLIC_ANSWER_WITH_SOURCE',
  ]);
  assert.equal(exported[0]!.metadata.source_rights_reviewed_at, '2026-09-22T10:00:00.000Z');
  assert.equal(exported[0]!.metadata.source_rights_recheck_at, '2026-10-22T10:00:00.000Z');
  assert.equal(exported[0]!.metadata.source_rights_reviewer_role, 'TEST_REVIEWER');
  assert.match(exported[0]!.metadata.source_document_payload_sha256!, /^[a-f0-9]{64}$/);
  assert.match(exported[0]!.metadata.chunk_content_sha256!, /^[a-f0-9]{64}$/);
});

test('verified public retrieval serves an untampered cryptographic chunk', async () => {
  const reviewed = source();
  const document = await controlledDocument();
  const store = await createBreizVerifiedPublicStore([document], {
    maxWords: 40,
    overlapWords: 5,
  });

  const answer = await retrieveBreizVerifiedLocalKnowledge(
    'controlled sentinel',
    store,
    4,
    NOW,
    (id) => (id === reviewed.id ? reviewed : undefined),
  );

  assert.equal(answer.status, 'answered_from_sources');
  assert.equal(answer.chunks.length, 1);
  assert.equal(answer.source_refs[0]!.source_name, 'Fixture source');
});

test('tampered vector chunk fails cryptographic retrieval even with valid rights metadata', async () => {
  const reviewed = source();
  const chunks = await chunkVerifiedBreizPublicDocument(
    await controlledDocument(),
    { maxWords: 40, overlapWords: 5 },
  );
  assert.equal(chunks.length > 0, true);

  const tampered = {
    ...chunks[0]!,
    content: chunks[0]!.content + ' tampered',
  };
  const store = new MockBreizVectorStore([tampered]);

  const answer = await retrieveBreizVerifiedLocalKnowledge(
    'controlled sentinel',
    store,
    4,
    NOW,
    (id) => (id === reviewed.id ? reviewed : undefined),
  );

  assert.equal(answer.status, 'not_enough_information');
  assert.deepEqual(answer.chunks, []);
});

test('default mock corpus cannot masquerade as reviewed public source authority', () => {
  const answer = retrieveBreizLocalKnowledge('Lorient harbor walk');
  assert.equal(answer.status, 'not_enough_information');
  assert.deepEqual(answer.chunks, []);
  assert.deepEqual(answer.source_refs, []);
});

test('internal_reference chunks remain excluded from public answers', () => {
  const internalOnly = MOCK_BREIZ_DOCUMENTS.filter(
    (doc) => doc.allowed_usage === 'internal_reference',
  );
  const store = createBreizMockStore(internalOnly);
  const answer = retrieveBreizLocalKnowledge('retrieval policy proxy', store);
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});
