/**
 * Regional companion lexicon.
 *
 * The regional lexicon is deliberately separate from MotsPet:
 * - MotsPet controls semantic/user-facing meaning;
 * - this module may only add culturally reviewed regional wording;
 * - unreviewed entries fail closed and are never injected in live prompts.
 */

export type RegionalLexiconStatus = 'PENDING_REVIEW' | 'VERIFIED';

export interface RegionalLexiconEntry {
  id: string;
  regionId: string;
  term: string;
  meaningFr: string;
  usage: 'greeting' | 'community' | 'place' | 'culture' | 'style';
  sourceNote: string;
  reviewer?: string;
  reviewedAt?: string;
  status: RegionalLexiconStatus;
}

/**
 * Existing Breton-flavoured product vocabulary is recorded here as candidate
 * material only. Presence in the current UI/persona code is not linguistic
 * validation and therefore does not promote these entries to VERIFIED.
 */
export const REGIONAL_LEXICON: readonly RegionalLexiconEntry[] = [
  {
    id: 'bretagne_demat',
    regionId: 'bretagne',
    term: 'Demat',
    meaningFr: 'Formule de salutation déjà présente dans le prototype Breiz.',
    usage: 'greeting',
    sourceNote:
      'Existing EMOPET prototype usage. Requires named Breton-language/cultural review before controlled regional release.',
    status: 'PENDING_REVIEW',
  },
  {
    id: 'bretagne_ar_veute',
    regionId: 'bretagne',
    term: 'Ar Veute',
    meaningFr: 'Nom actuellement utilisé sur certaines surfaces communautaires du prototype.',
    usage: 'community',
    sourceNote:
      'Existing EMOPET prototype usage. Spelling, meaning and cultural appropriateness require named review before controlled regional release.',
    status: 'PENDING_REVIEW',
  },
] as const;

export function getRegionalLexicon(regionId: string): readonly RegionalLexiconEntry[] {
  return REGIONAL_LEXICON.filter((entry) => entry.regionId === regionId);
}

export function getVerifiedRegionalLexicon(regionId: string): readonly RegionalLexiconEntry[] {
  return getRegionalLexicon(regionId).filter((entry) => entry.status === 'VERIFIED');
}

export function buildRegionalLexiconPromptBlock(regionId: string): string {
  const verified = getVerifiedRegionalLexicon(regionId);

  if (verified.length === 0) {
    return [
      '# Lexique régional contrôlé',
      'Aucun terme régional n’est actuellement VERIFIED pour ce territoire.',
      'N’invente pas de dialecte, d’accent, de slogan local ou de traduction culturelle. Utilise un français naturel et le nom régional explicitement fourni par le profil.',
    ].join('\n');
  }

  return [
    '# Lexique régional contrôlé',
    ...verified.map((entry) => `- ${entry.term}: ${entry.meaningFr}`),
    'Ces termes peuvent colorer la formulation, sans modifier le sens scientifique, la confiance, la provenance, la confidentialité ou le consentement.',
  ].join('\n');
}
