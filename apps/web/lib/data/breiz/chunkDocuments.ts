import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';

export interface ChunkOptions {
  maxWords?: number;
  overlapWords?: number;
  maxDocumentChars?: number;
  maxChunksPerDocument?: number;
  maxDocuments?: number;
}

function wordsOf(text: string): string[] {
  return text.split(/\s+/).map((word) => word.trim()).filter(Boolean);
}

export function chunkBreizDocument(document: BreizDocument, options: ChunkOptions = {}): BreizDocumentChunk[] {
  const maxWords = Math.max(40, Math.min(options.maxWords ?? 140, 400));
  const overlapWords = Math.max(0, Math.min(options.overlapWords ?? 20, Math.floor(maxWords / 3)));
  const maxDocumentChars = Math.max(1_000, Math.min(options.maxDocumentChars ?? 80_000, 250_000));
  const maxChunksPerDocument = Math.max(1, Math.min(options.maxChunksPerDocument ?? 80, 200));
  const words = wordsOf(document.content.slice(0, maxDocumentChars));
  if (words.length === 0) return [];

  const chunks: BreizDocumentChunk[] = [];
  let start = 0;
  while (start < words.length && chunks.length < maxChunksPerDocument) {
    const end = Math.min(words.length, start + maxWords);
    const content = words.slice(start, end).join(' ');
    const { content: _content, ...metadata } = document;
    chunks.push({
      id: `${document.id}::${chunks.length}`,
      document_id: document.id,
      chunk_index: chunks.length,
      title: document.title,
      content,
      token_estimate: Math.ceil(content.length / 4),
      metadata,
    });
    if (end === words.length) break;
    start = Math.max(start + 1, end - overlapWords);
  }
  return chunks;
}

export function chunkBreizDocuments(documents: BreizDocument[], options: ChunkOptions = {}): BreizDocumentChunk[] {
  const maxDocuments = Math.max(1, Math.min(options.maxDocuments ?? 500, 2_000));
  return documents.slice(0, maxDocuments).flatMap((document) => chunkBreizDocument(document, options));
}

export function exportChunksForVectorStore(chunks: BreizDocumentChunk[]) {
  return chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.content,
    metadata: {
      document_id: chunk.document_id,
      title: chunk.title,
      source_name: chunk.metadata.source_name,
      source_url: chunk.metadata.source_url,
      license: chunk.metadata.license,
      territory: chunk.metadata.territory,
      region: chunk.metadata.region,
      department: chunk.metadata.department,
      commune: chunk.metadata.commune,
      theme: chunk.metadata.theme,
      tags: chunk.metadata.tags,
      reliability_level: chunk.metadata.reliability_level,
      last_checked_at: chunk.metadata.last_checked_at,
      allowed_usage: chunk.metadata.allowed_usage,
      chunk_index: chunk.chunk_index,
    },
  }));
}
