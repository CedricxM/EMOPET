/**
 * Narration interactive de la connaissance de race (Partie C).
 *
 * Deux registres STRICTEMENT séparés :
 *  - récit/relation (ton libre, chaleureux) — `narrate*`
 *  - donnée ELI (ton VERROUILLÉ, factuel, avec niveau de confiance) — `lockedEliStatement`
 * Une phrase qui énonce un indicateur passe TOUJOURS par le registre verrouillé.
 *
 * Invariants : aucune émotion prêtée au chien, aucun glissement médical
 * (« cherche le frais » oui, « hyperthermie » non), une SEULE forme d'implication
 * par récit. Données de race VERIFIED uniquement ; sinon honnêteté (pas d'invention).
 */

import type { Breed } from './breeds';
import { COAT_LABELS } from './breeds';
import type { ConfidenceState } from './eli/catalog';
import type { ContextualInterpretation } from './eli/breed-aware-interpretation';

export type Register = 'recit' | 'donnee_eli';
export type HookKind = 'question' | 'action' | 'confirmation';

export interface Narration {
  register: 'recit';
  text: string;
  /** Une seule forme d'implication (jamais plusieurs). Peut être absente. */
  hook?: { kind: HookKind; text: string };
}

const CONF_LABEL: Record<ConfidenceState, string> = {
  VALID: 'confiance élevée',
  DEGRADED: 'confiance partielle',
  SUPPRESSED: 'données insuffisantes',
};

const METRIC_LABEL: Record<string, string> = {
  activite: 'Activité',
  repos: 'Repos',
  regulation: 'Régulation',
  sociabilite: 'Sociabilité',
};

/**
 * Registre VERROUILLÉ : énoncé factuel d'un indicateur ELI, avec sa confiance.
 * Aucune chaleur, aucune interprétation médicale ou émotionnelle.
 */
export function lockedEliStatement(metric: string, value: number, confidence: ConfidenceState): string {
  return `${METRIC_LABEL[metric] ?? metric} : ${value.toFixed(0)}/100 (${CONF_LABEL[confidence]}).`;
}

function originClause(breed: Breed): string {
  return breed.countryOfOrigin ? `, une race originaire de ${breed.countryOfOrigin}` : '';
}

function coatClause(breed: Breed): string | null {
  return breed.coatTypeDefault ? `${COAT_LABELS[breed.coatTypeDefault]}` : null;
}

/* ------------------------------------------------------------------ */
/* Moment 1 — inscription                                              */
/* ------------------------------------------------------------------ */

export function narrateSignupBreedIntro(dogName: string): Narration {
  return {
    register: 'recit',
    text: `Dis-moi la race de ${dogName} — ça m'aide à mieux comprendre ses journées, parce qu'un lévrier et un bouvier ne vivent pas leur temps de la même façon.`,
    hook: { kind: 'question', text: `Quelle est la race de ${dogName} ?` },
  };
}

/** Après le choix de race : propose le pelage par défaut, à confirmer (déclaration prioritaire). */
export function narrateCoatConfirmation(dogName: string, breed: Breed): Narration {
  const coat = coatClause(breed);
  if (!coat || breed.verificationStatus !== 'VERIFIED') {
    return {
      register: 'recit',
      text: `Je n'ai pas d'information vérifiée sur le poil de cette race — autant que tu me le dises directement.`,
      hook: { kind: 'confirmation', text: `${dogName} a plutôt le poil court, moyen, long ou double ?` },
    };
  }
  return {
    register: 'recit',
    text: `Les ${breed.nameFr ?? breed.nameOfficial} ont souvent le ${coat}.`,
    hook: { kind: 'confirmation', text: `C'est le cas de ${dogName} ?` },
  };
}

/* ------------------------------------------------------------------ */
/* Moment 3 — sur demande : raconter la race                          */
/* ------------------------------------------------------------------ */

export function narrateBreedStory(dogName: string, breed: Breed): Narration {
  if (breed.verificationStatus !== 'VERIFIED') {
    return {
      register: 'recit',
      text: `Je n'ai pas de fiche vérifiée pour cette race, et je préfère ne rien inventer. Ce que tu m'en dis fera foi.`,
      hook: { kind: 'confirmation', text: `Tu veux me préciser son poil et son gabarit ?` },
    };
  }
  const coat = coatClause(breed);
  const name = breed.nameFr ?? breed.nameOfficial;
  const parts = [`Le ${name} de ${dogName}${originClause(breed)}.`];
  if (coat) parts.push(`Côté allure, c'est un ${coat}${breed.morphologyNotes ? ` — ${breed.morphologyNotes.toLowerCase()}` : ''}`.trim().replace(/\.\.$/, '.'));
  // Hook unique : si on connaît le poil → confirmation, sinon ouverture vers le réel.
  const hook = coat
    ? { kind: 'confirmation' as const, text: `Son poil correspond bien à ce profil ?` }
    : { kind: 'action' as const, text: `Je peux te suggérer des coins de balade adaptés à son énergie, ça t'intéresse ?` };
  return { register: 'recit', text: parts.join(' '), hook };
}

/* ------------------------------------------------------------------ */
/* Moment 2 — au fil de l'eau : contextualiser une observation ELI     */
/* ------------------------------------------------------------------ */

export interface ContextualNarration {
  /** Récit chaleureux (registre libre), sans énoncer la donnée chiffrée. */
  narrative: string;
  /** Énoncé de l'indicateur — registre VERROUILLÉ (factuel + confiance). */
  eli: string;
  hook?: { kind: HookKind; text: string };
}

/**
 * Compose un récit autour d'une observation contextualisée (Partie B), en
 * gardant l'énoncé chiffré dans le registre verrouillé. Non médical.
 */
export function narrateContextualObservation(
  dogName: string,
  metric: string,
  value: number,
  confidence: ConfidenceState,
  interpretation: ContextualInterpretation,
): ContextualNarration {
  const factors = interpretation.contextFactors;
  let narrative: string;
  if (interpretation.expectedGivenProfile) {
    const why = factors.length ? ` (${factors.join(', ')})` : '';
    narrative = `Aujourd'hui${why}, c'est normal que ${dogName} lève le pied et cherche le frais — EMOPET en tient compte avant de te signaler quoi que ce soit.`;
  } else {
    narrative = `Voici où en est ${dogName} sur la période.`;
  }
  return {
    narrative,
    eli: lockedEliStatement(metric, value, confidence),
    hook: interpretation.expectedGivenProfile
      ? { kind: 'action', text: `Tu veux que je te montre les coins où il aime se poser quand la température grimpe ?` }
      : undefined,
  };
}
