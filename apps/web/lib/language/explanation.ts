import type { SemanticEvidenceEnvelope } from './types';

export interface ExplanationSlots {
  observe: string;
  explain?: string;
  qualify?: string;
  connect?: string;
}

export function qualificationForEnvelope(envelope: SemanticEvidenceEnvelope): string | undefined {
  if (envelope.publicationGate === 'SUPPRESSED') {
    return "EMOPET n’a pas assez d’éléments fiables pour publier une interprétation plus précise.";
  }
  if (envelope.publicationGate === 'DEGRADED') {
    return "L’information disponible est limitée, donc l’interprétation doit rester prudente.";
  }
  if (envelope.publicationGate === 'UNKNOWN') {
    return "Je n’ai pas encore assez d’informations fiables pour aller plus loin.";
  }
  if (envelope.missingModalities?.length) {
    return `Il manque encore certaines sources d’information (${envelope.missingModalities.join(', ')}).`;
  }
  return undefined;
}

export function composeExplanation(slots: ExplanationSlots): string {
  return [slots.observe, slots.explain, slots.qualify, slots.connect]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n\n');
}

export function composeEvidenceAwareExplanation(
  envelope: SemanticEvidenceEnvelope,
  slots: Omit<ExplanationSlots, 'qualify'> & { qualify?: string },
): string {
  return composeExplanation({
    ...slots,
    qualify: slots.qualify ?? qualificationForEnvelope(envelope),
  });
}
