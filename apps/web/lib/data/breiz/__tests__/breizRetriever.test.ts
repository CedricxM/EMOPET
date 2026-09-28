import assert from 'node:assert/strict';
import test from 'node:test';

import type { BreizDocument } from '../breizDocument.schema';
import { chunkBreizDocuments, exportChunksForVectorStore } from '../chunkDocuments';
import { ingestBreizDocuments } from '../ingestDocuments';
import { MOCK_BREIZ_DOCUMENTS } from '../mockDocuments';
import { createBreizMockStore, retrieveBreizLocalKnowledge } from '../breizRetriever';

const CONTROLLED_DOCUMENT: BreizDocument = {
  id: 'controlled-fixture',
  title: 'Controlled fixture',
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
  theme: 'test',
  tags: ['fixture'],
  summary: 'Controlled fixture.',
  content: 'controlled sentinel content for provenance metadata testing',
  reliability_level: 'source_verified',
  last_checked_at: '2026-09-23',
  allowed_usage: 'public_answer_with_source',
};

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

test('vector export preserves immutable authority-binding primitives', () => {
  const chunks = chunkBreizDocuments([CONTROLLED_DOCUMENT], { maxWords: 40, overlapWords: 5 });
  const exported = exportChunksForVectorStore(chunks);

  assert.equal(exported[0]!.metadata.source_registry_id, 'fixture-source');
  assert.equal(exported[0]!.metadata.source_authority_revision, 'review-001');
  assert.equal(exported[0]!.metadata.source_immutable_version, 'dataset-v1');
  assert.equal(exported[0]!.metadata.source_receipt_path, 'data/registry/receipts/fixture.json');
  assert.equal(exported[0]!.metadata.source_attribution_text, 'Fixture publisher');
});

test('default mock corpus cannot masquerade as reviewed public source authority', () => {
  const answer = retrieveBreizLocalKnowledge('Lorient harbor walk');
  assert.equal(answer.status, 'not_enough_information');
  assert.deepEqual(answer.chunks, []);
  assert.deepEqual(answer.source_refs, []);
});

test('internal_reference chunks remain excluded from public answers', () => {
  const internalOnly = MOCK_BREIZ_DOCUMENTS.filter((doc) => doc.allowed_usage === 'internal_reference');
  const store = createBreizMockStore(internalOnly);
  const answer = retrieveBreizLocalKnowledge('retrieval policy proxy', store);
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});
