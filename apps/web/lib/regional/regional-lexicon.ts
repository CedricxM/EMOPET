/**
 * Regional companion lexicon.
 *
 * MotsPet controls semantic meaning. This module may only add culturally
 * reviewed regional wording. A status flip alone is insufficient: VERIFIED
 * entries require a named, dated review receipt before prompt injection.
 */

export const REGIONAL_LEXICON_REVISION =
  'regional-lexicon-v0.2-seed-2026-10-01' as const;

export type RegionalLexiconStatus = 'PENDING_REVIEW' | 'VERIFIED';
export type RegionalLexiconUsage =
  | 'greeting'
  | 'community'
  | 'place'
  | 'culture'
  | 'style';

export interface RegionalLexiconEntry {
  id: string;
  regionId: string;
  term: string;
  meaningFr: string;
  usage: RegionalLexiconUsage;
  sourceNote: string;
  revision: typeof REGIONAL_LEXICON_REVISION;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewReceipt: string | null;
  /** Exact public wording covered by the review receipt. */
  reviewedTerm: string | null;
  /** Exact French meaning covered by the review receipt. */
  reviewedMeaningFr: string | null;
  /** Exact usage category covered by the review receipt. */
  reviewedUsage: RegionalLexiconUsage | null;
  /** Exact lexicon revision covered by the review receipt. */
  reviewedRevision: typeof REGIONAL_LEXICON_REVISION | null;
  status: RegionalLexiconStatus;
}

const pendingReview = {
  revision: REGIONAL_LEXICON_REVISION,
  reviewer: null,
  reviewedAt: null,
  reviewReceipt: null,
  reviewedTerm: null,
  reviewedMeaningFr: null,
  reviewedUsage: null,
  reviewedRevision: null,
  status: 'PENDING_REVIEW' as const,
};

export const REGIONAL_LEXICON: readonly RegionalLexiconEntry[] = [
  {
    id: 'bretagne_demat',
    regionId: 'bretagne',
    term: 'Demat',
    meaningFr: 'Formule de salutation déjà présente dans le prototype Breiz.',
    usage: 'greeting',
    sourceNote:
      'Existing EMOPET prototype usage. Requires named Breton-language/cultural review before controlled regional release.',
    ...pendingReview,
  },
  {
    id: 'bretagne_ar_veute',
    regionId: 'bretagne',
    term: 'Ar Veute',
    meaningFr: 'Nom actuellement utilisé sur certaines surfaces communautaires du prototype.',
    usage: 'community',
    sourceNote:
      'Existing EMOPET prototype usage. Spelling, meaning and cultural appropriateness require named review before controlled regional release.',
    ...pendingReview,
  },
] as const;

export function getRegionalLexicon(regionId: string): readonly RegionalLexiconEntry[] {
  return REGIONAL_LEXICON.filter((entry) => entry.regionId === regionId);
}

export function hasCompleteRegionalReviewReceipt(
  entry: RegionalLexiconEntry,
  nowMs: number = Date.now(),
): boolean {
  if (entry.status !== 'VERIFIED') return false;
  if (!entry.reviewer?.trim() || !entry.reviewReceipt?.trim()) return false;
  if (!entry.reviewedAt?.trim()) return false;

  const reviewedAt = Date.parse(entry.reviewedAt);
  if (!Number.isFinite(reviewedAt) || reviewedAt > nowMs) return false;

  return (
    entry.reviewedTerm === entry.term
    && entry.reviewedMeaningFr === entry.meaningFr
    && entry.reviewedUsage === entry.usage
    && entry.reviewedRevision === entry.revision
  );
}

export function getVerifiedRegionalLexicon(regionId: string): readonly RegionalLexiconEntry[] {
  return getRegionalLexicon(regionId).filter(hasCompleteRegionalReviewReceipt);
}

export function buildRegionalLexiconPromptBlock(regionId: string): string {
  const verified = getVerifiedRegionalLexicon(regionId);

  if (verified.length === 0) {
    return [
      '# Lexique régional contrôlé',
      `Révision : ${REGIONAL_LEXICON_REVISION}`,
      'Aucun terme régional n’est actuellement VERIFIED avec un reçu de review complet pour ce territoire.',
      'N’invente pas de dialecte, d’accent, de slogan local ou de traduction culturelle. Utilise un français naturel et le nom régional explicitement fourni par le profil.',
    ].join('\n');
  }

  return [
    '# Lexique régional contrôlé',
    `Révision : ${REGIONAL_LEXICON_REVISION}`,
    ...verified.map((entry) => `- ${entry.term}: ${entry.meaningFr}`),
    'Ces termes peuvent colorer la formulation, sans modifier le sens scientifique, la confiance, la provenance, la confidentialité ou le consentement.',
  ].join('\n');
}
