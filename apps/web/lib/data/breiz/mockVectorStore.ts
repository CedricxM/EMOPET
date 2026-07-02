import type { BreizDocumentChunk } from './breizDocument.schema';

export interface VectorSearchHit {
  chunk: BreizDocumentChunk;
  score: number;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

export class MockBreizVectorStore {
  private readonly chunks: BreizDocumentChunk[];
  private readonly chunkTokens: Array<{ chunk: BreizDocumentChunk; tokens: Set<string> }>;

  constructor(chunks: BreizDocumentChunk[]) {
    this.chunks = chunks;
    this.chunkTokens = chunks.map((chunk) => ({
      chunk,
      tokens: tokenize(`${chunk.title} ${chunk.content} ${chunk.metadata.tags.join(' ')}`),
    }));
  }

  all(): BreizDocumentChunk[] {
    return [...this.chunks];
  }

  search(query: string, k = 4): VectorSearchHit[] {
    const queryTokens = tokenize(query);
    if (queryTokens.size === 0) return [];

    return this.chunkTokens
      .map(({ chunk, tokens }) => {
        let score = 0;
        for (const token of queryTokens) if (tokens.has(token)) score += 1;
        return { chunk, score };
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
      .slice(0, k);
  }
}
