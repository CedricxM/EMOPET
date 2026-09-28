import { chunkBreizDocuments } from './chunkDocuments';
import { MOCK_BREIZ_DOCUMENTS } from './mockDocuments';
import { MockBreizVectorStore } from './mockVectorStore';
import { getBreizSource, isBreizSourceReleaseReady } from './sourceRegistry';
import type { BreizSourceDescriptor } from './sourceRegistry';
import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';

export interface BreizSourceRef {
  title: string;
  source_name: string;
  source_url: string | null;
  license: string;
  attribution: string;
}

export interface BreizRetrievalAnswer {
  status: 'answered_from_sources' | 'not_enough_information';
  query: string;
  chunks: BreizDocumentChunk[];
  source_refs: BreizSourceRef[];
  note: string;
}

export interface BreizChunkAuthorityVerdict {
  authorized: boolean;
  blockers: string[];
}

/**
 * Pure authority comparison used by the runtime and deterministic tests.
 *
 * A matching registry id is not enough. The chunk must carry the exact reviewed
 * authority revision, immutable source version, receipt pointer and source
 * identity that are still current in the registry review record.
 */
export function evaluateBreizChunkReleaseAuthority(
  chunk: BreizDocumentChunk,
  source: BreizSourceDescriptor | undefined,
  nowMs: number = Date.now(),
): BreizChunkAuthorityVerdict {
  const blockers: string[] = [];

  if (chunk.metadata.allowed_usage !== 'public_answer_with_source') blockers.push('USAGE_NOT_PUBLIC');
  if (chunk.metadata.reliability_level !== 'source_verified') blockers.push('SOURCE_NOT_VERIFIED');
  if (chunk.metadata.license.trim() === '') blockers.push('CHUNK_LICENCE_MISSING');

  const sourceRegistryId = chunk.metadata.source_registry_id?.trim();
  const binding = chunk.metadata.source_authority_binding;

  if (!sourceRegistryId) blockers.push('SOURCE_REGISTRY_ID_MISSING');
  if (!binding) blockers.push('AUTHORITY_BINDING_MISSING');
  if (!source) blockers.push('REGISTRY_SOURCE_MISSING');

  if (!source || !isBreizSourceReleaseReady(source, nowMs)) {
    blockers.push('REGISTRY_RELEASE_NOT_READY');
    return { authorized: false, blockers: [...new Set(blockers)] };
  }

  const evidence = source.rightsEvidence;
  if (!binding || !evidence || !sourceRegistryId) {
    return { authorized: false, blockers: [...new Set(blockers)] };
  }

  if (sourceRegistryId !== source.id || binding.source_registry_id !== source.id) {
    blockers.push('REGISTRY_ID_MISMATCH');
  }
  if (binding.authority_revision !== evidence.authorityRevision) {
    blockers.push('AUTHORITY_REVISION_MISMATCH');
  }
  if (binding.immutable_source_version !== evidence.immutableSourceVersion) {
    blockers.push('IMMUTABLE_VERSION_MISMATCH');
  }
  if (binding.receipt_path !== evidence.receiptPath) {
    blockers.push('RECEIPT_PATH_MISMATCH');
  }
  if (binding.attribution_text !== evidence.attributionText) {
    blockers.push('ATTRIBUTION_MISMATCH');
  }

  // H-07C-02: source identity carried by the chunk must agree with the reviewed
  // registry identity. A matching string id cannot lend authority to unrelated
  // source name/url/licence metadata.
  if (binding.source_name !== source.name || chunk.metadata.source_name !== binding.source_name) {
    blockers.push('SOURCE_NAME_MISMATCH');
  }
  if (binding.source_url !== source.canonicalUrl || chunk.metadata.source_url !== binding.source_url) {
    blockers.push('SOURCE_URL_MISMATCH');
  }
  if (source.license == null || binding.license !== source.license || chunk.metadata.license !== binding.license) {
    blockers.push('SOURCE_LICENCE_MISMATCH');
  }

  return { authorized: blockers.length === 0, blockers: [...new Set(blockers)] };
}

function canAnswerFromChunk(chunk: BreizDocumentChunk): boolean {
  const sourceRegistryId = chunk.metadata.source_registry_id?.trim();
  const source = sourceRegistryId ? getBreizSource(sourceRegistryId) : undefined;
  return evaluateBreizChunkReleaseAuthority(chunk, source).authorized;
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
      note: 'The local corpus does not contain enough reviewed and provenance-bound information for this question.',
    };
  }

  const sourceRefs: BreizSourceRef[] = chunks.flatMap((chunk) => {
    const binding = chunk.metadata.source_authority_binding;
    if (!binding) return [];
    return [{
      title: chunk.title,
      source_name: binding.source_name,
      source_url: binding.source_url,
      license: binding.license,
      attribution: binding.attribution_text,
    }];
  });

  return {
    status: 'answered_from_sources',
    query,
    chunks,
    source_refs: sourceRefs,
    note: 'Use these chunks as grounded context. Do not add local facts that are absent from the reviewed sources.',
  };
}
