import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkBreizDocuments, exportChunksForVectorStore } from '../chunkDocuments';
import { ingestBreizDocuments } from '../ingestDocuments';
import { MOCK_BREIZ_DOCUMENTS } from '../mockDocuments';
import { createBreizMockStore, retrieveBreizLocalKnowledge } from '../breizRetriever';

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

test('Breiz chunks export vector-store-ready metadata', () => {
  const chunks = chunkBreizDocuments(MOCK_BREIZ_DOCUMENTS, { maxWords: 40, overlapWords: 5 });
  const exported = exportChunksForVectorStore(chunks);
  assert.ok(exported.length >= MOCK_BREIZ_DOCUMENTS.length);
  assert.equal(exported[0]!.metadata.region, 'Bretagne');
  assert.ok('source_name' in exported[0]!.metadata);
});

test('Breiz retrieval returns sourced chunks or not_enough_information', () => {
  const store = createBreizMockStore(MOCK_BREIZ_DOCUMENTS);
  const answer = retrieveBreizLocalKnowledge('Lorient harbor walk', store);
  assert.equal(answer.status, 'answered_from_sources');
  assert.ok(answer.source_refs.length > 0);

  const missing = retrieveBreizLocalKnowledge('zzznomatch qqq void', store);
  assert.equal(missing.status, 'not_enough_information');
  assert.equal(missing.chunks.length, 0);
  assert.equal(missing.source_refs.length, 0);
  assert.ok(missing.note.includes('does not contain enough sourced information'));
});

test('Breiz retrieval filters internal_reference chunks from public answers', () => {
  const internalOnly = MOCK_BREIZ_DOCUMENTS.filter((doc) => doc.allowed_usage === 'internal_reference');
  const store = createBreizMockStore(internalOnly);
  const answer = retrieveBreizLocalKnowledge('retrieval policy proxy', store);
  assert.equal(answer.status, 'not_enough_information');
  assert.equal(answer.chunks.length, 0);
  assert.equal(answer.source_refs.length, 0);
});
