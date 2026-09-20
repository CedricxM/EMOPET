export type BreizReliabilityLevel = 'source_verified' | 'curated_mock' | 'community_pending' | 'unknown';
export type BreizAllowedUsage = 'internal_reference' | 'public_answer_with_source' | 'retrieval_only' | 'do_not_answer';

export interface BreizDocument {
  id: string;
  title: string;
  source_name: string;
  source_url: string | null;
  license: string;
  territory: string;
  region: string;
  department: string | null;
  commune: string | null;
  theme: string;
  tags: string[];
  summary: string;
  content: string;
  reliability_level: BreizReliabilityLevel;
  last_checked_at: string;
  allowed_usage: BreizAllowedUsage;
}

export interface BreizDocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  title: string;
  content: string;
  token_estimate: number;
  metadata: Omit<BreizDocument, 'content'>;
}

export function validateBreizDocument(document: BreizDocument): string[] {
  const errors: string[] = [];
  if (!document.id.trim()) errors.push('id is required');
  if (!document.title.trim()) errors.push('title is required');
  if (!document.source_name.trim()) errors.push('source_name is required');
  if (!document.license.trim()) errors.push('license is required');
  if (!document.content.trim()) errors.push('content is required');
  if (!document.last_checked_at.trim()) errors.push('last_checked_at is required');
  return errors;
}
