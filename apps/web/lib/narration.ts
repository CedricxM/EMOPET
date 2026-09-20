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
 *
 * Provenance : tout énoncé d'indicateur exige une `EliStatementProvenance` explicite.
 * C'est le second chemin de publication ELI du web, à côté du tableau de bord —
 * voir l'inventaire ELI-ARCH-G1 de #118. Aucune valeur ne peut être énoncée sans
 * déclarer sa source, et une source non autoritative est marquée `DÉMO ·`.
 */

import type { Breed } from './breeds';
import { COAT_LABELS } from './breeds';
import type { ConfidenceState } from './eli/catalog';
import type { ContextualInterpretation } from './eli/breed-aware-interpretation';

export type Register = 'recit' | 'donnee_eli';
export type HookKind = 'question' | 'action' | 'confirmation';

/**
 * Provenance OBLIGATOIRE de toute donnée ELI énoncée par la narration.
 *
 * Même vocabulaire que la quarantaine du tableau de bord (`ELI_WEB_MOCK_PROVENANCE`,
 * ELI-ARCH-G3 / #118) afin qu'il n'existe qu'UNE seule convention de provenance web :
 * l'objet exporté par `lib/eli/mock-provenance` satisfait structurellement ce type.
 *
 * L'argument est requis par construction : il doit être impossible de publier un
 * indicateur sans déclarer d'où il vient. Le moteur canonique `@emopet/eli-engine`
 * n'étant câblé à aucun module runtime, il n'existe aujourd'hui aucune source
 * autoritative — voir ELI-ARCH-G1/G5 (#118).
 */
export interface EliStatementProvenance {
  /** `DEMO_MOCK_ONLY` tant qu'aucun producteur canonique n'existe. */
  readonly classification: string;
  /** `false` interdit toute présentation de la valeur comme observation. */
  readonly authoritative: boolean;
  /** La valeur provient-elle d'une observation capteur MAT/TAG ? */
  readonly matTagObservationSource: boolean;
  /** La valeur provient-elle d'une inférence ELI backend ? */
  readonly backendInferenceSource: boolean;
}

/** Marqueur visible, identique à celui des atomes du tableau de bord (#118 / G3). */
export const ELI_DEMO_PREFIX = 'DÉMO · ';

/**
 * Fail-closed : une provenance n'est autoritative que si elle le déclare ET
 * s'appuie sur une source réelle. Toute autre combinaison est traitée comme démo.
 */
export function isAuthoritativeEliProvenance(provenance: EliStatementProvenance): boolean {
  return (
    provenance.authoritative === true &&
    (provenance.matTagObservationSource === true || provenance.backendInferenceSource === true)
  );
}

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
 *
 * `provenance` est requis : tant qu'elle n'est pas autoritative, l'énoncé est
 * préfixé `DÉMO · ` pour qu'aucune valeur simulée ne puisse être lue comme une
 * observation. Le nombre n'est jamais publié nu.
 */
export function lockedEliStatement(
  metric: string,
  value: number,
  confidence: ConfidenceState,
  provenance: EliStatementProvenance,
): string {
  const statement = `${METRIC_LABEL[metric] ?? metric} : ${value.toFixed(0)}/100 (${CONF_LABEL[confidence]}).`;
  return isAuthoritativeEliProvenance(provenance) ? statement : `${ELI_DEMO_PREFIX}${statement}`;
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
  /** Provenance de la donnée énoncée, transportée jusqu'à la surface d'affichage. */
  provenance: EliStatementProvenance;
  /** `false` tant qu'aucune source MAT/TAG ou backend n'alimente la valeur. */
  authoritative: boolean;
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
  provenance: EliStatementProvenance,
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
    eli: lockedEliStatement(metric, value, confidence, provenance),
    provenance,
    authoritative: isAuthoritativeEliProvenance(provenance),
    hook: interpretation.expectedGivenProfile
      ? { kind: 'action', text: `Tu veux que je te montre les coins où il aime se poser quand la température grimpe ?` }
      : undefined,
  };
}
