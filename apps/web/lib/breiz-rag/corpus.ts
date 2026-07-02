/**
 * Corpus de connaissances Breiz (R4 — RAG sans entraînement de modèle).
 *
 * Breiz CONSULTE ce corpus (données ouvertes + référentiels EMOPET) pour
 * répondre avec du contenu réel et sourcé. Aucune génération par un modèle
 * entraîné : récupération (retrieval) + synthèse extractive.
 *
 * ⚠ Invariants : aucune affirmation médicale ; toute demande qui exige un avis
 * vétérinaire est redirigée vers un vétérinaire ; aucune émotion humaine attribuée au chien.
 */

import { BREED_DOCS } from './breeds.generated';

export interface KnowledgeDoc {
  id: string;
  title: string;
  text: string;
  source: string;
  tags: string[];
}

/** Connaissances statiques (comportement, bien-être, Bretagne, produit EMOPET). */
export const STATIC_DOCS: KnowledgeDoc[] = [
  {
    id: 'beh-apaisement',
    title: 'Signaux d’apaisement',
    text: "Bâillements, léchage de truffe, détournement du regard, ralentissement : ce sont des signaux d’apaisement (Rugaas). Les observer aide à comprendre quand un chien cherche à désamorcer une situation. Ce sont des observations comportementales, pas des émotions humaines.",
    source: 'Rugaas, T. (2006). On Talking Terms with Dogs.',
    tags: ['comportement', 'signaux', 'apaisement', 'communication', 'langage'],
  },
  {
    id: 'beh-posture',
    title: 'Lire la posture',
    text: "La position des oreilles, de la queue et du poids du corps renseigne sur l’état d’activation. Une posture basse et figée appelle de la distance ; une posture souple indique la disponibilité au jeu.",
    source: 'Handelman, B. (2012). Canine Behavior.',
    tags: ['comportement', 'posture', 'langage', 'corps'],
  },
  {
    id: 'beh-renforcement',
    title: 'Renforcement positif',
    text: "Récompenser le comportement souhaité au bon moment renforce son apparition. Le timing et la constance comptent plus que l’intensité de la récompense. Méthode recommandée pour le rappel et le retour au calme.",
    source: 'Pryor, K. (1999). Don’t Shoot the Dog.',
    tags: ['éducation', 'dressage', 'renforcement', 'rappel', 'récompense'],
  },
  {
    id: 'beh-limites',
    title: 'Poser des limites claires',
    text: "Des règles cohérentes et prévisibles sécurisent le chien. Mieux vaut peu de règles bien tenues que beaucoup de règles fluctuantes.",
    source: 'Donaldson, J. (1996). The Culture Clash.',
    tags: ['éducation', 'limites', 'règles', 'cadre'],
  },
  {
    id: 'wb-exercice',
    title: 'Besoins d’exercice',
    text: "Les besoins d’exercice varient selon la race, l’âge et l’individu. L’enjeu n’est pas la quantité brute mais la régularité et la variété : marche, flair, jeu. Pour un doute sur l’effort adapté, demandez conseil à votre vétérinaire.",
    source: 'Foster et al. (2021).',
    tags: ['bien-être', 'exercice', 'activité', 'balade', 'sortie'],
  },
  {
    id: 'wb-repos',
    title: 'Importance du repos',
    text: "Un chien adulte se repose une grande partie de la journée. Un espace calme et des routines stables favorisent des phases de repos continues. EMOPET observe la régularité du repos, sans formuler d'évaluation vétérinaire.",
    source: 'Foster et al. (2021).',
    tags: ['bien-être', 'repos', 'sommeil', 'nuit', 'calme', 'routine'],
  },
  {
    id: 'wb-chaleur',
    title: 'Chaleur et effort',
    text: "Par temps chaud, réduisez l’effort aux heures fraîches (tôt le matin, en soirée) et proposez de l’eau. Les races brachycéphales (museau court) sont plus sensibles à la chaleur. En cas de halètement intense ou d’abattement, consultez un vétérinaire.",
    source: 'BSAVA — thermorégulation canine.',
    tags: ['bien-être', 'chaleur', 'été', 'effort', 'brachycéphale', 'eau'],
  },
  {
    id: 'br-meteo',
    title: 'Sortir par tous les temps en Bretagne',
    text: "En Bretagne, le crachin et le vent font partie du quotidien. Un équipement adapté (séchage au retour, protection des coussinets l’hiver) rend les sorties confortables toute l’année.",
    source: 'Météo-France — climat breton.',
    tags: ['bretagne', 'météo', 'pluie', 'vent', 'sortie', 'balade'],
  },
  {
    id: 'br-plages',
    title: 'Plages et réglementation',
    text: "L’accès des chiens aux plages varie selon la commune et la saison. Beaucoup de plages bretonnes sont tolérées hors saison estivale ; vérifiez les arrêtés municipaux. Tenez le chien à distance des baigneurs et des zones de nidification.",
    source: 'Arrêtés municipaux — accès plages.',
    tags: ['bretagne', 'plage', 'mer', 'réglementation', 'spot', 'baignade'],
  },
  {
    id: 'em-eli',
    title: 'Ce que mesure ELI (non médical)',
    text: "ELI fusionne les signaux du MAT (tapis) et du TAG (collier) pour produire des indicateurs de bien-être NON médicaux : activité, repos, régularité, phases de calme. Chaque indicateur affiche un niveau de confiance (élevé, partiel, insuffisant). ELI ne formule aucune évaluation vétérinaire.",
    source: 'Méthode propriétaire EMOPET.',
    tags: ['emopet', 'eli', 'indicateur', 'mat', 'tag', 'confiance', 'mesure'],
  },
  {
    id: 'em-baseline',
    title: 'La baseline personnelle',
    text: "EMOPET observe votre chien pendant 14 jours pour figer une baseline (référence personnelle). Les écarts sont ensuite mesurés par rapport à cette baseline, pas à une norme générale. Un écart notable invite à observer le contexte, jamais à formuler une évaluation vétérinaire.",
    source: 'Méthode propriétaire EMOPET.',
    tags: ['emopet', 'baseline', 'référence', '14 jours', 'écart'],
  },
  {
    id: 'em-veute',
    title: 'La Veute (communauté)',
    text: "La Veute réunit les propriétaires bretons : balades de groupe, spots partagés sur la carte, entraide entre cercles de ville. Les données de bien-être de votre chien restent strictement privées et ne sont jamais partagées dans les cercles.",
    source: 'EMOPET — communauté Breiz.',
    tags: ['communauté', 'veute', 'cercle', 'balade', 'social', 'rgpd'],
  },
  {
    id: 'policy-veterinaire',
    title: 'Rôle du vétérinaire',
    text: "Breiz n’est pas un outil médical et ne remplace pas un vétérinaire. Pour tout signe inhabituel persistant (appétit, mobilité, comportement, respiration), prenez rendez-vous avec votre vétérinaire qui pourra examiner le contexte.",
    source: 'EMOPET — cadre non médical.',
    tags: ['vétérinaire', 'médical', 'symptôme', 'consultation'],
  },
];

/** Corpus complet = statique + races (référentiel FCI réel). */
export const ALL_DOCS: KnowledgeDoc[] = [...STATIC_DOCS, ...BREED_DOCS];
