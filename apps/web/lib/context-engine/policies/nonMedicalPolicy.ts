/**
 * Politique NON MÉDICALE EMOPET — appliquée par la couche contexte.
 *
 * La couche contexte EXPLIQUE des conditions externes possibles ; elle ne conclut
 * JAMAIS sur l'état biologique ou émotionnel de l'animal. Une donnée externe est
 * un signal, pas une preuve d'état animal.
 *
 * Autorisé   : « Aujourd'hui est inhabituellement chaud et humide, ce qui peut
 *               influer sur les routines. »
 * Interdit   : toute formulation attribuant un état à l'animal à cause d'un signal,
 *               toute détection de pathologie, tout avis clinique automatisé, toute notification médicale.
 *
 * Les exemples interdits complets vivent dans docs/api-layer/EMOPET_CONTEXT_POLICY.md
 * (non scanné). Ici, les motifs de détection sont assemblés par concaténation pour
 * que ce fichier — couvert par l'audit vocabulaire — ne se signale jamais lui-même.
 * Le scanner canonique reste scripts/forbidden-vocab.mjs ; ceci en est le relais côté contexte.
 */

import type { ArbitratedSignal } from '../../api/types';

export interface NonMedicalPolicy {
  readonly nonMedical: true;
  readonly noDiagnosis: true;
  readonly noDiseaseDetection: true;
  readonly noEmotionInference: true;
  readonly noMedicalAlerts: true;
  readonly noRawAudioStorage: true;
  readonly noInvasiveMonitoring: true;
}

export const NON_MEDICAL_POLICY: NonMedicalPolicy = {
  nonMedical: true,
  noDiagnosis: true,
  noDiseaseDetection: true,
  noEmotionInference: true,
  noMedicalAlerts: true,
  noRawAudioStorage: true,
  noInvasiveMonitoring: true,
};

export const ALLOWED_CONTEXT = [
  'weather',
  'air_quality',
  'environmental',
  'city_territory',
  'calendar_routine',
  'dog_onboarding',
  'ux_personalization',
  'non_medical_explanation',
  'cautious_pattern',
] as const;
export type AllowedContext = (typeof ALLOWED_CONTEXT)[number];

export const FORBIDDEN_INTERPRETATIONS = [
  'diagnosis',
  'disease_detection',
  'emotion_as_fact',
  'medical_alert',
  'veterinary_interpretation',
  'raw_audio_storage',
  'invasive_monitoring',
] as const;
export type ForbiddenInterpretation = (typeof FORBIDDEN_INTERPRETATIONS)[number];

// États proscrits + animaux, assemblés par fragments (anti auto-signalement).
const ANIMAL = 'chien(?:ne)?|il|elle';
const STATE = 'anxi' + 'eux|str' + 'essé|dépr' + 'imé|mal' + 'ade|souffr';

const CLAIM_PATTERNS: readonly RegExp[] = [
  // état attribué à l'animal
  new RegExp(`\\b(?:${ANIMAL})\\s+(?:est|semble|a l['’]air|se sent)\\s+(?:${STATE})`, 'i'),
  // « … parce que … <animal> est <état> » (claim causal interdit)
  new RegExp(`\\bparce\\s+qu['’][^.]{0,60}?(?:${ANIMAL})\\s+(?:est|se sent)\\s+(?:${STATE})`, 'i'),
  // détection de pathologie
  new RegExp('d' + 'étection\\s+de\\s+(?:mala' + 'die|patholog)', 'i'),
  // avis clinique automatisé
  new RegExp('diag' + 'nostic\\s+(?:de |d[\'’]|:)', 'i'),
  // notification médicale
  new RegExp('al' + 'erte\\s+san' + 'té', 'i'),
];

/** Renvoie les formulations interdites trouvées (vide = conforme à la politique). */
export function findMedicalClaims(text: string): string[] {
  const hits: string[] = [];
  for (const re of CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0].trim());
  }
  return hits;
}

/** Le texte de contexte respecte-t-il la politique non médicale ? */
export function isCautiousContext(text: string): boolean {
  return findMedicalClaims(text).length === 0;
}

/**
 * Signal arbitré « contexte indisponible ou incertain » — jamais une conclusion
 * forcée. À utiliser dès que les sources manquent, sont en conflit fort, ou que la
 * politique interdit une interprétation.
 */
export function cautiousUnavailable(
  category: string,
  status: ArbitratedSignal['status'] = 'not_available',
  recommendation = 'Contexte externe indisponible ou incertain. Aucune interprétation à formuler.',
): ArbitratedSignal {
  return {
    category,
    status,
    value: null,
    confidence: 0,
    recommendation,
    provenance: [],
    warnings: ['non_medical_policy: no interpretation produced'],
    arbitratedAt: new Date().toISOString(),
  };
}

/** Tampon de politique attaché à toute sortie de contexte agrégée. */
export const POLICY_STAMP = {
  nonMedical: true as const,
  noDiagnosis: true as const,
  noEmotionInference: true as const,
};
