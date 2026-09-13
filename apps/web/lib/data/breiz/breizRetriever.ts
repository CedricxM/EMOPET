import { chunkBreizDocuments } from './chunkDocuments';
import { MOCK_BREIZ_DOCUMENTS } from './mockDocuments';
import { MockBreizVectorStore } from './mockVectorStore';
import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';

export interface BreizRetrievalAnswer {
  status: 'answered_from_sources' | 'not_enough_information';
  query: string;
  chunks: BreizDocumentChunk[];
  source_refs: Array<{ title: string; source_name: string; source_url: string | null }>;
  note: string;
}

/**
 * Public-answer retrieval is fail-closed: a chunk must be both explicitly
 * allowed for sourced public answers and already source-verified. Generic/local
 * ingestion cannot assign `source_verified`, so raw files cannot self-promote
 * into this path.
 *
 * This is still not a substitute for DATA-LIC-G6 rightsEvidence review. It is a
 * runtime containment boundary while item-level promotion authority is built.
 */
function canAnswerFromChunk(chunk: BreizDocumentChunk): boolean {
  return chunk.metadata.allowed_usage === 'public_answer_with_source' &&
    chunk.metadata.reliability_level === 'source_verified';
}

export function createBreizMockStore(documents: BreizDocument[] = MOCK_BREIZ_DOCUMENTS): MockBreizVectorStore {
  return new MockBreizVectorStore(chunkBreizDocuments(documents));
}

export function retrieveBreizLocalKnowledge(
  query: string,
  store: MockBreizVectorStore = createBreizMockStore(),
  k = 4,
): BreizRetrievalAnswer {
  const safeK = Math.max(1, Math.min(k, 8));
  const hits = store.search(query, safeK * 3);
  const chunks = hits.map((hit) => hit.chunk).filter(canAnswerFromChunk).slice(0, safeK);
  if (chunks.length === 0) {
    return {
      status: 'not_enough_information',
      query,
      chunks: [],
      source_refs: [],
      note: 'The local corpus does not contain enough sourced information for this question.',
    };
  }

  const sourceRefs = chunks.map((chunk) => ({
    title: chunk.title,
    source_name: chunk.metadata.source_name,
    source_url: chunk.metadata.source_url,
  }));

  return {
    status: 'answered_from_sources',
    query,
    chunks,
    source_refs: sourceRefs,
    note: 'Use these chunks as grounded context. Do not add local facts that are absent from the sources.',
  };
}
