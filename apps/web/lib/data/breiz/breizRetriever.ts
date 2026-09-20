import { chunkBreizDocuments } from './chunkDocuments';
import { MOCK_BREIZ_DOCUMENTS } from './mockDocuments';
import { MockBreizVectorStore } from './mockVectorStore';
import type { BreizDocument, BreizDocumentChunk } from './breizDocument.schema';

/**
 * Une source publiée porte ses termes.
 *
 * Les neuf entrées de `BREIZ_SOURCE_REGISTRY` sont toutes marquées
 * `ATTRIBUTION_REQUIRED`. Citer un extrait sans sa licence, c'est publier une
 * référence que le lecteur ne peut pas vérifier et dont l'obligation ne suit
 * pas — exactement l'attribution par item qu'exige la gate DATA-LIC-G6 de #116.
 */
export interface BreizSourceRef {
  title: string;
  source_name: string;
  source_url: string | null;
  license: string;
}

export interface BreizRetrievalAnswer {
  status: 'answered_from_sources' | 'not_enough_information';
  query: string;
  chunks: BreizDocumentChunk[];
  source_refs: BreizSourceRef[];
  note: string;
}

/**
 * Fail-closed : `public_answer_with_source` ne suffit pas sans licence.
 *
 * Le filtre d'origine ne lisait que `allowed_usage`. Un extrait dont la licence
 * était absente pouvait donc être publié avec citation, la citation ne portant
 * de toute façon aucun terme. Les deux moitiés du problème se tenaient : on ne
 * vérifiait pas la licence, et on ne la publiait pas.
 *
 * Un extrait sans licence n'est pas publiable. L'abstention est un comportement
 * produit valide ; publier sans preuve ne l'est pas.
 */
function canAnswerFromChunk(chunk: BreizDocumentChunk): boolean {
  if (chunk.metadata.allowed_usage !== 'public_answer_with_source') return false;
  return chunk.metadata.license.trim() !== '';
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

  const sourceRefs: BreizSourceRef[] = chunks.map((chunk) => ({
    title: chunk.title,
    source_name: chunk.metadata.source_name,
    source_url: chunk.metadata.source_url,
    license: chunk.metadata.license,
  }));

  return {
    status: 'answered_from_sources',
    query,
    chunks,
    source_refs: sourceRefs,
    note: 'Use these chunks as grounded context. Do not add local facts that are absent from the sources.',
  };
}
