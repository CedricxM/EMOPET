export type BreizReliabilityLevel = 'source_verified' | 'curated_mock' | 'community_pending' | 'unknown';
export type BreizAllowedUsage = 'internal_reference' | 'public_answer_with_source' | 'retrieval_only' | 'do_not_answer';

/**
 * Immutable snapshot of the reviewed source authority that was attached by a
 * controlled promotion step. Raw/local ingestion must never mint this object.
 */
export interface BreizSourceAuthorityBinding {
  source_registry_id: string;
  authority_revision: string;
  immutable_source_version: string;
  receipt_path: string;
  source_name: string;
  source_url: string;
  license: string;
  attribution_text: string;
}

export interface BreizDocument {
  id: string;
  title: string;
  source_name: string;
  source_url: string | null;
  /** Registry identity alone is not release authority. */
  source_registry_id?: string | null;
  /**
   * Provenance-bound reviewed authority. Missing or stale bindings fail closed
   * for public answers.
   */
  source_authority_binding?: BreizSourceAuthorityBinding | null;
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

  const binding = document.source_authority_binding;
  if (binding) {
    if (!document.source_registry_id?.trim()) errors.push('source_registry_id is required when source_authority_binding is present');
    if (document.source_registry_id?.trim() !== binding.source_registry_id.trim()) {
      errors.push('source_registry_id must match source_authority_binding');
    }
    if (!binding.authority_revision.trim()) errors.push('source_authority_binding.authority_revision is required');
    if (!binding.immutable_source_version.trim()) errors.push('source_authority_binding.immutable_source_version is required');
    if (!binding.receipt_path.trim()) errors.push('source_authority_binding.receipt_path is required');
    if (!binding.source_name.trim()) errors.push('source_authority_binding.source_name is required');
    if (!binding.source_url.trim()) errors.push('source_authority_binding.source_url is required');
    if (!binding.license.trim()) errors.push('source_authority_binding.license is required');
    if (!binding.attribution_text.trim()) errors.push('source_authority_binding.attribution_text is required');
  }

  return errors;
}
