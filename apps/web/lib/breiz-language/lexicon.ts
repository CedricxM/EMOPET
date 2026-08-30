export type BreizLexiconDomain = 'rhythm' | 'evidence' | 'affective' | 'exploration';

export interface BreizLexiconEntry {
  term: string;
  domain: BreizLexiconDomain;
  meaning: string;
  useWhen: string;
  avoidWhen?: string;
}

/**
 * Controlled language dictionary for Breiz.
 *
 * This is a writing / explanation layer, not a new scientific ontology and
 * not a self-learning memory. Terms may enrich phrasing only when they remain
 * faithful to the available evidence and its confidence state.
 */
export const BREIZ_LEXICON: readonly BreizLexiconEntry[] = [
  {
    term: 'cadence',
    domain: 'rhythm',
    meaning: 'organisation temporelle d’une séquence ou d’une routine observée',
    useWhen: 'plusieurs événements sont distribués dans le temps de façon comparable',
  },
  {
    term: 'fenêtre',
    domain: 'rhythm',
    meaning: 'intervalle de temps réellement pris en compte dans une observation',
    useWhen: 'la durée ou la période d’analyse est connue',
  },
  {
    term: 'récurrence',
    domain: 'rhythm',
    meaning: 'réapparition d’un motif sur plusieurs observations distinctes',
    useWhen: 'le même motif est effectivement présent à plusieurs reprises',
    avoidWhen: 'une seule occurrence est disponible',
  },
  {
    term: 'inflexion',
    domain: 'rhythm',
    meaning: 'changement local dans l’allure d’un signal ou d’une séquence',
    useWhen: 'un changement de direction ou de niveau est visible sans prétendre en connaître la cause',
  },
  {
    term: 'transition',
    domain: 'rhythm',
    meaning: 'passage observable d’un état descriptif à un autre',
    useWhen: 'on décrit par exemple repos → éveil ou activation faible → modérée',
  },
  {
    term: 'variabilité',
    domain: 'rhythm',
    meaning: 'degré de changement d’une mesure ou d’un motif dans le temps',
    useWhen: 'plusieurs observations permettent réellement de comparer la dispersion ou les changements',
  },
  {
    term: 'concordance',
    domain: 'evidence',
    meaning: 'plusieurs indices indépendants vont dans une direction compatible',
    useWhen: 'au moins deux sources ou observations soutiennent la même lecture descriptive',
    avoidWhen: 'une seule source est disponible',
  },
  {
    term: 'divergence',
    domain: 'evidence',
    meaning: 'des indices ne racontent pas exactement la même chose',
    useWhen: 'les sources ou mesures sont réellement discordantes',
  },
  {
    term: 'faisceau d’indices',
    domain: 'evidence',
    meaning: 'ensemble de signaux partiels qui peuvent être considérés conjointement',
    useWhen: 'plusieurs indices sont présents mais ne constituent pas une preuve clinique',
  },
  {
    term: 'provenance',
    domain: 'evidence',
    meaning: 'origine d’une donnée, d’un contexte ou d’une information citée',
    useWhen: 'Breiz explique d’où vient ce qu’il avance',
  },
  {
    term: 'incertitude',
    domain: 'evidence',
    meaning: 'part de ce que les données disponibles ne permettent pas de fixer précisément',
    useWhen: 'toute inférence ou représentation Valence–Arousal comporte une marge non nulle',
  },
  {
    term: 'abstention',
    domain: 'evidence',
    meaning: 'décision de ne pas conclure lorsque la qualité ou la quantité d’information est insuffisante',
    useWhen: 'la confiance est SUPPRESSED ou que les données ne justifient pas une lecture',
  },
  {
    term: 'activation',
    domain: 'affective',
    meaning: 'axe descriptif de niveau d’activation, de faible à élevé',
    useWhen: 'une représentation Valence–Arousal est explicitement disponible',
    avoidWhen: 'aucune donnée ne permet de situer l’activation',
  },
  {
    term: 'valence',
    domain: 'affective',
    meaning: 'axe descriptif négatif ↔ positif dans un espace Valence–Arousal',
    useWhen: 'la sortie du système fournit explicitement cette dimension et son incertitude',
    avoidWhen: 'pour transformer directement la valence en “heureux”, “triste”, “anxieux” ou autre émotion affirmée',
  },
  {
    term: 'trajectoire',
    domain: 'affective',
    meaning: 'déplacement descriptif d’une position dans le temps',
    useWhen: 'plusieurs points temporels comparables existent dans le même espace',
    avoidWhen: 'un seul point est disponible',
  },
  {
    term: 'zone d’incertitude',
    domain: 'affective',
    meaning: 'représentation visible de la précision limitée autour d’un état estimé',
    useWhen: 'une estimation possède une marge ou un niveau de confiance',
  },
  {
    term: 'repère',
    domain: 'exploration',
    meaning: 'élément de contexte utile pour relire une observation dans le quotidien',
    useWhen: 'un horaire, un lieu, une routine ou un événement déclaré aide à contextualiser',
  },
  {
    term: 'motif',
    domain: 'exploration',
    meaning: 'forme ou organisation qui se répète dans les observations',
    useWhen: 'une structure est visible sans lui attribuer une cause psychologique',
  },
  {
    term: 'piste',
    domain: 'exploration',
    meaning: 'question ou comparaison à explorer ensuite, sans prétendre qu’elle est déjà démontrée',
    useWhen: 'Breiz propose une prochaine observation ou comparaison',
  },
  {
    term: 'contexte déclaré',
    domain: 'exploration',
    meaning: 'information fournie par le gardien et distinguée des mesures capteurs',
    useWhen: 'une information utilisateur est utilisée pour interpréter ou comparer une observation',
  },
] as const;

export const BREIZ_FORBIDDEN_SHORTCUTS = [
  'score de santé',
  'health score',
  'émotion détectée',
  'humeur détectée',
  'il est anxieux',
  'il est triste',
  'il est heureux',
] as const;

export const BREIZ_DEMO_LEXICON = BREIZ_LEXICON.filter((entry) =>
  ['cadence', 'inflexion', 'concordance', 'faisceau d’indices', 'trajectoire', 'abstention'].includes(entry.term),
);

function lineFor(entry: BreizLexiconEntry): string {
  const avoid = entry.avoidWhen ? ` Évite ce terme si : ${entry.avoidWhen}.` : '';
  return `- ${entry.term} — ${entry.meaning}. Emploie-le quand : ${entry.useWhen}.${avoid}`;
}

export function buildBreizLanguagePromptBlock(): string {
  return `# Dictionnaire contrôlé de Breiz\nLe vocabulaire doit être précis, vivant et varié, jamais décoratif au détriment de l'exactitude. Tu peux puiser dans le dictionnaire ci-dessous quand le terme est exact. N'essaie pas de placer ces mots artificiellement et n'accumule pas du jargon : un ou deux termes distinctifs bien choisis valent mieux qu'une phrase prétentieuse. Si un terme technique risque d'être obscur, explique-le brièvement dans la phrase. Le dictionnaire enrichit la formulation ; il n'augmente jamais le niveau de certitude.\n\n${BREIZ_LEXICON.map(lineFor).join('\n')}\n\n# Raccourcis interdits\nNe transforme jamais les données en score de santé ou en lecture émotionnelle certaine. N'affirme jamais automatiquement : ${BREIZ_FORBIDDEN_SHORTCUTS.join(', ')}. Tu peux reprendre un de ces mots si l'utilisateur l'emploie, mais seulement pour le nuancer, le questionner ou expliquer pourquoi les données ne permettent pas de l'affirmer.`;
}
