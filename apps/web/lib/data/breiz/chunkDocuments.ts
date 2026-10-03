import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';
import {
  computeBreizChunkContentSha256,
  verifyBreizDocumentPayloadIntegrity,
} from './documentIntegrity';

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

function chunkBreizDocumentUnchecked(
  document: BreizDocument,
  options: ChunkOptions = {},
): BreizDocumentChunk[] {
  const maxWords = Math.max(40, Math.min(options.maxWords ?? 140, 400));
  const overlapWords = Math.max(
    0,
    Math.min(options.overlapWords ?? 20, Math.floor(maxWords / 3)),
  );
  const maxDocumentChars = Math.max(
    1_000,
    Math.min(options.maxDocumentChars ?? 80_000, 250_000),
  );
  const maxChunksPerDocument = Math.max(
    1,
    Math.min(options.maxChunksPerDocument ?? 80, 200),
  );
  const words = wordsOf(document.content.slice(0, maxDocumentChars));
  if (words.length === 0) return [];

  const chunks: BreizDocumentChunk[] = [];
  let start = 0;
  while (start < words.length && chunks.length < maxChunksPerDocument) {
    const end = Math.min(words.length, start + maxWords);
    const content = words.slice(start, end).join(' ');
    const { content: _content, ...metadata } = document;
    chunks.push({
      id: document.id + '::' + chunks.length,
      document_id: document.id,
      chunk_index: chunks.length,
      title: document.title,
      content,
      token_estimate: Math.ceil(content.length / 4),
      content_sha256: null,
      metadata,
    });
    if (end === words.length) break;
    start = Math.max(start + 1, end - overlapWords);
  }
  return chunks;
}

/**
 * Synchronous chunking is intentionally unavailable for authority-bound public
 * documents because their cryptographic payload snapshot cannot be verified
 * synchronously in the web runtime.
 */
export function chunkBreizDocument(
  document: BreizDocument,
  options: ChunkOptions = {},
): BreizDocumentChunk[] {
  if (document.source_authority_binding != null) return [];
  return chunkBreizDocumentUnchecked(document, options);
}

export function chunkBreizDocuments(
  documents: BreizDocument[],
  options: ChunkOptions = {},
): BreizDocumentChunk[] {
  const maxDocuments = Math.max(
    1,
    Math.min(options.maxDocuments ?? 500, 2_000),
  );
  return documents
    .slice(0, maxDocuments)
    .flatMap((document) => chunkBreizDocument(document, options));
}

export async function chunkVerifiedBreizPublicDocument(
  document: BreizDocument,
  options: ChunkOptions = {},
): Promise<BreizDocumentChunk[]> {
  if (
    document.reliability_level !== 'source_verified' ||
    document.allowed_usage !== 'public_answer_with_source' ||
    document.source_authority_binding == null
  ) {
    return [];
  }

  if (!(await verifyBreizDocumentPayloadIntegrity(document))) return [];

  const chunks = chunkBreizDocumentUnchecked(document, options);
  const verified: BreizDocumentChunk[] = [];

  for (const chunk of chunks) {
    const contentSha256 = await computeBreizChunkContentSha256(chunk);
    if (!contentSha256) return [];
    verified.push({
      ...chunk,
      content_sha256: contentSha256,
    });
  }

  return verified;
}

export async function chunkVerifiedBreizPublicDocuments(
  documents: BreizDocument[],
  options: ChunkOptions = {},
): Promise<BreizDocumentChunk[]> {
  const maxDocuments = Math.max(
    1,
    Math.min(options.maxDocuments ?? 500, 2_000),
  );
  const chunks: BreizDocumentChunk[] = [];
  for (const document of documents.slice(0, maxDocuments)) {
    chunks.push(...(await chunkVerifiedBreizPublicDocument(document, options)));
  }
  return chunks;
}

export function exportChunksForVectorStore(chunks: BreizDocumentChunk[]) {
  return chunks.map((chunk) => {
    const binding = chunk.metadata.source_authority_binding;
    return {
      id: chunk.id,
      text: chunk.content,
      metadata: {
        document_id: chunk.document_id,
        title: chunk.title,
        chunk_content_sha256: chunk.content_sha256,
        source_name: chunk.metadata.source_name,
        source_url: chunk.metadata.source_url,
        source_registry_id: chunk.metadata.source_registry_id ?? null,
        source_authority_revision: binding?.authority_revision ?? null,
        source_immutable_version: binding?.immutable_source_version ?? null,
        source_receipt_path: binding?.receipt_path ?? null,
        source_attribution_text: binding?.attribution_text ?? null,
        source_permitted_use_summary: binding?.permitted_use_summary ?? null,
        source_allowed_product_uses: binding?.allowed_product_uses ?? null,
        source_rights_reviewed_at: binding?.rights_reviewed_at ?? null,
        source_rights_recheck_at: binding?.rights_recheck_at ?? null,
        source_rights_reviewer_role: binding?.reviewer_role ?? null,
        source_document_payload_sha256:
          binding?.document_payload_sha256 ?? null,
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
    };
  });
}
