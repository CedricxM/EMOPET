import assert from 'node:assert/strict';
import test from 'node:test';
import type { BreizDocument } from '../breizDocument.schema';
import { chunkBreizDocuments, exportChunksForVectorStore } from '../chunkDocuments';
import { ingestBreizDocuments } from '../ingestDocuments';
import { MOCK_BREIZ_DOCUMENTS } from '../mockDocuments';
import { createBreizMockStore, retrieveBreizLocalKnowledge } from '../breizRetriever';

const PUBLIC_SOURCE_FIXTURE: BreizDocument = {
  id: 'verified-public-fixture',
  title: 'Verified public source fixture',
  source_name: 'Controlled test fixture',
  source_url: 'https://example.invalid/controlled-fixture',
  license: 'Test fixture only',
  territory: 'Bretagne',
  region: 'Bretagne',
  department: null,
  commune: 'Lorient',
  theme: 'test',
  tags: ['controlled', 'fixture'],
  summary: 'Fixture used only to prove the retriever public-answer filter.',
  content: 'controlled-public-sentinel information is available from this verified test fixture',
  reliability_level: 'source_verified',
  last_checked_at: '2026-09-13',
  allowed_usage: 'public_answer_with_source',
};

test('Breiz ingestion parses markdown and preserves source defaults', () => {
  const result = ingestBreizDocuments([
    {
      filename: 'lorient.md',
      content: '# Lorient local note\nFlat harbor loops and local route notes.',
    },
  ]);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.documents[0]!.title, 'Lorient local note');
  assert.equal(result.documents[0]!.region, 'Bretagne');
});

test('Breiz local ingestion cannot self-authorize verified public answers', () => {
  const result = ingestBreizDocuments([
    {
      filename: 'self-authorized.json',
      content: JSON.stringify({
        id: 'self-authorized',
        title: 'Self authorization sentinel',
        source_name: 'Unreviewed local payload',
        source_url: 'https://example.invalid/unreviewed',
        license: 'CC-BY-4.0',
        content: 'sentinel-rights-bypass should never become a public answer from raw import alone',
        reliability_level: 'source_verified',
        allowed_usage: 'public_answer_with_source',
        last_checked_at: '2026-09-13',
      }),
    },
  ]);

  assert.equal(result.rejected.length, 0);
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0]!.allowed_usage, 'retrieval_only');
  assert.equal(result.documents[0]!.reliability_level, 'unknown');

  const store = createBreizMockStore(result.documents);
  const answer = retrieveBreizLocalKnowledge('sentinel-rights-bypass', store);
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});

test('Breiz chunks export vector-store-ready metadata', () => {
  const chunks = chunkBreizDocuments(MOCK_BREIZ_DOCUMENTS, { maxWords: 40, overlapWords: 5 });
  const exported = exportChunksForVectorStore(chunks);
  assert.ok(exported.length >= MOCK_BREIZ_DOCUMENTS.length);
  assert.equal(exported[0]!.metadata.region, 'Bretagne');
  assert.ok('source_name' in exported[0]!.metadata);
});

test('Breiz retriever answers only from an explicitly verified public fixture', () => {
  const store = createBreizMockStore([PUBLIC_SOURCE_FIXTURE]);
  const answer = retrieveBreizLocalKnowledge('controlled-public-sentinel', store);
  assert.equal(answer.status, 'answered_from_sources');
  assert.ok(answer.source_refs.length > 0);

  const missing = retrieveBreizLocalKnowledge('zzznomatch qqq void', store);
  assert.equal(missing.status, 'not_enough_information');
  assert.equal(missing.chunks.length, 0);
  assert.equal(missing.source_refs.length, 0);
  assert.ok(missing.note.includes('does not contain enough sourced information'));
});

test('Breiz default mock corpus cannot produce public answers', () => {
  const answer = retrieveBreizLocalKnowledge('Lorient harbor walk');
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});

test('Breiz retrieval filters internal_reference chunks from public answers', () => {
  const internalOnly = MOCK_BREIZ_DOCUMENTS.filter((doc) => doc.allowed_usage === 'internal_reference');
  const store = createBreizMockStore(internalOnly);
  const answer = retrieveBreizLocalKnowledge('retrieval policy proxy', store);
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});
