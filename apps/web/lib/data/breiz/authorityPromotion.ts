import {
  getBreizSource,
  isBreizSourcePublicAnswerReady,
  type BreizSourceDescriptor,
} from './sourceRegistry';
import {
  validateBreizDocument,
  type BreizDocument,
  type BreizSourceAuthorityBinding,
} from './breizDocument.schema';
import { evaluateBreizDocumentFreshness } from './contentFreshness';
import { computeBreizDocumentPayloadSha256 } from './documentIntegrity';

type SourceLookup = (id: string) => BreizSourceDescriptor | undefined;

export type BreizPublicPromotionFailureReason =
  | 'source_not_registered'
  | 'source_not_public_answer_ready'
  | 'document_not_neutral'
  | 'document_already_bound'
  | 'document_freshness_invalid'
  | 'integrity_digest_unavailable'
  | 'promoted_document_invalid';

export type BreizPublicPromotionResult =
  | {
      ready: false;
      reason: BreizPublicPromotionFailureReason;
      validationErrors: readonly string[];
    }
  | {
      ready: true;
      reason: 'ok';
      document: BreizDocument;
    };

/**
 * Derives an immutable authority snapshot only from a currently reviewed source.
 * External payload fields never participate in this binding.
 */
export function deriveBreizSourceAuthorityBinding(
  source: BreizSourceDescriptor,
  documentPayloadSha256: string,
  nowMs: number = Date.now(),
): BreizSourceAuthorityBinding | null {
  if (!isBreizSourcePublicAnswerReady(source, nowMs)) return null;

  const evidence = source.rightsEvidence;
  const license = source.license;
  if (!evidence || !license) return null;

  return {
    source_registry_id: source.id,
    authority_revision: evidence.authorityRevision,
    immutable_source_version: evidence.immutableSourceVersion,
    receipt_path: evidence.receiptPath,
    source_name: source.name,
    source_url: source.canonicalUrl,
    license,
    attribution_text: evidence.attributionText,
    permitted_use_summary: evidence.permittedUseSummary,
    allowed_product_uses: [...evidence.allowedProductUses],
    rights_reviewed_at: evidence.reviewedAt,
    rights_recheck_at: evidence.recheckAt ?? null,
    reviewer_role: evidence.reviewerRole,
    document_payload_sha256: documentPayloadSha256,
  };
}

/**
 * Controlled promotion boundary from neutral retrieval-only data to a
 * provenance-bound public-answer document.
 *
 * The default lookup is the repository source registry. A custom lookup exists
 * for deterministic tests and controlled composition only; serving still
 * revalidates the exact binding against the live registry.
 */
export async function promoteBreizDocumentForPublicAnswer(
  document: BreizDocument,
  sourceRegistryId: string,
  nowMs: number = Date.now(),
  lookup: SourceLookup = getBreizSource,
): Promise<BreizPublicPromotionResult> {
  const source = lookup(sourceRegistryId);
  if (!source) {
    return {
      ready: false,
      reason: 'source_not_registered',
      validationErrors: [],
    };
  }

  if (
    document.source_registry_id != null ||
    document.source_authority_binding != null
  ) {
    return {
      ready: false,
      reason: 'document_already_bound',
      validationErrors: [],
    };
  }

  if (
    document.reliability_level !== 'unknown' ||
    document.allowed_usage !== 'retrieval_only'
  ) {
    return {
      ready: false,
      reason: 'document_not_neutral',
      validationErrors: [],
    };
  }

  const freshness = evaluateBreizDocumentFreshness(document, source, nowMs);
  if (freshness !== 'fresh') {
    return {
      ready: false,
      reason: 'document_freshness_invalid',
      validationErrors: [`content freshness: ${freshness}`],
    };
  }

  const promotedBase: BreizDocument = {
    ...document,
    source_name: source.name,
    source_url: source.canonicalUrl,
    source_registry_id: source.id,
    source_authority_binding: undefined,
    license: source.license ?? document.license,
    reliability_level: 'source_verified',
    allowed_usage: 'public_answer_with_source',
  };

  const documentPayloadSha256 =
    await computeBreizDocumentPayloadSha256(promotedBase);
  if (!documentPayloadSha256) {
    return {
      ready: false,
      reason: 'integrity_digest_unavailable',
      validationErrors: [],
    };
  }

  const binding = deriveBreizSourceAuthorityBinding(
    source,
    documentPayloadSha256,
    nowMs,
  );
  if (!binding) {
    return {
      ready: false,
      reason: 'source_not_public_answer_ready',
      validationErrors: [],
    };
  }

  const promoted: BreizDocument = {
    ...promotedBase,
    source_authority_binding: binding,
  };

  const validationErrors = validateBreizDocument(promoted);
  if (validationErrors.length > 0) {
    return {
      ready: false,
      reason: 'promoted_document_invalid',
      validationErrors,
    };
  }

  return {
    ready: true,
    reason: 'ok',
    document: promoted,
  };
}
