/**
 * Corpus de connaissances Breiz (R4 — RAG sans entraînement de modèle).
 *
 * Breiz CONSULTE ce corpus (données ouvertes + référentiels EMOPET) pour
 * répondre avec du contenu réel et sourcé. Aucune génération par un modèle
 * entraîné : récupération (retrieval) + synthèse extractive.
 *
 * ⚠ Invariants : aucune affirmation médicale ; toute demande qui exige un avis
 * vétérinaire est redirigée vers un vétérinaire ; aucune émotion humaine attribuée au chien.
 *
 * Provenance (D1, #226) : chaque fiche déclare sa provenance (`./provenance`).
 * Une fiche éditoriale ne cite que des références complètes ; un fait
 * territorial de tiers passe par le registre des droits Breiz.
 * Affirmations produit (D2, #226) : une fiche ne répète pas une affirmation
 * produit tant qu'aucune autorité contrôlée ne la confirme (durée de baseline,
 * fusion ELI publiée, garantie de confidentialité des cercles).
 */

import { BREED_DOCS } from './breeds.generated';
import type { KnowledgeProvenance } from './provenance';

export interface KnowledgeDoc {
  id: string;
  title: string;
  text: string;
  provenance: KnowledgeProvenance;
  tags: string[];
}

const editorial = (...references: string[]): KnowledgeProvenance => ({ kind: 'editorial', references });

/** Connaissances statiques (comportement, bien-être, Bretagne, produit EMOPET). */
export const STATIC_DOCS: KnowledgeDoc[] = [
  {
    id: 'beh-apaisement',
    title: 'Signaux d’apaisement',
    text: "Bâillements, léchage de truffe, détournement du regard, ralentissement : ce sont des signaux d’apaisement (Rugaas). Les observer aide à comprendre quand un chien cherche à désamorcer une situation. Ce sont des observations comportementales, pas des émotions humaines.",
    provenance: editorial('Rugaas, T. (2006). On Talking Terms with Dogs.'),
    tags: ['comportement', 'signaux', 'apaisement', 'communication', 'langage'],
  },
  {
    id: 'beh-posture',
    title: 'Lire la posture',
    text: "La position des oreilles, de la queue et du poids du corps renseigne sur l’état d’activation. Une posture basse et figée appelle de la distance ; une posture souple indique la disponibilité au jeu.",
    provenance: editorial('Handelman, B. (2012). Canine Behavior.'),
    tags: ['comportement', 'posture', 'langage', 'corps'],
  },
  {
    id: 'beh-renforcement',
    title: 'Renforcement positif',
    text: "Récompenser le comportement souhaité au bon moment renforce son apparition. Le timing et la constance comptent plus que l’intensité de la récompense. Méthode recommandée pour le rappel et le retour au calme.",
    provenance: editorial('Pryor, K. (1999). Don’t Shoot the Dog.'),
    tags: ['éducation', 'dressage', 'renforcement', 'rappel', 'récompense'],
  },
  {
    id: 'beh-limites',
    title: 'Poser des limites claires',
    text: "Des règles cohérentes et prévisibles sécurisent le chien. Mieux vaut peu de règles bien tenues que beaucoup de règles fluctuantes.",
    provenance: editorial('Donaldson, J. (1996). The Culture Clash.'),
    tags: ['éducation', 'limites', 'règles', 'cadre'],
  },
  {
    // « Foster et al. (2021) » retiré : référence incomplète, non vérifiable (D1).
    id: 'wb-exercice',
    title: 'Besoins d’exercice',
    text: "Les besoins d’exercice varient selon la race, l’âge et l’individu. L’enjeu n’est pas la quantité brute mais la régularité et la variété : marche, flair, jeu. Pour un doute sur l’effort adapté, demandez conseil à votre vétérinaire.",
    provenance: editorial(),
    tags: ['bien-être', 'exercice', 'activité', 'balade', 'sortie'],
  },
  {
    id: 'wb-repos',
    title: 'Importance du repos',
    text: "Un chien adulte se repose une grande partie de la journée. Un espace calme et des routines stables favorisent des phases de repos continues. EMOPET observe la régularité du repos, sans formuler d'évaluation vétérinaire.",
    provenance: editorial(),
    tags: ['bien-être', 'repos', 'sommeil', 'nuit', 'calme', 'routine'],
  },
  {
    // « BSAVA — thermorégulation canine » retiré : aucun document identifié (D1).
    id: 'wb-chaleur',
    title: 'Chaleur et effort',
    text: "Par temps chaud, réduisez l’effort aux heures fraîches (tôt le matin, en soirée) et proposez de l’eau. Les races brachycéphales (museau court) sont plus sensibles à la chaleur. En cas de halètement intense ou d’abattement, consultez un vétérinaire.",
    provenance: editorial(),
    tags: ['bien-être', 'chaleur', 'été', 'effort', 'brachycéphale', 'eau'],
  },
  {
    // « Météo-France — climat breton » retiré : aucun document identifié (D1).
    id: 'br-meteo',
    title: 'Sortir par tous les temps en Bretagne',
    text: "En Bretagne, le crachin et le vent font partie du quotidien. Un équipement adapté (séchage au retour, protection des coussinets l’hiver) rend les sorties confortables toute l’année.",
    provenance: editorial(),
    tags: ['bretagne', 'météo', 'pluie', 'vent', 'sortie', 'balade'],
  },
  {
    // Conseil éditorial seulement. Un fait territorial (règle d'une plage donnée)
    // doit venir d'une source du registre des droits (D1) ; « Arrêtés municipaux »
    // n'était pas une source mais un renvoi, que le texte garde.
    id: 'br-plages',
    title: 'Plages et réglementation',
    text: "L’accès des chiens aux plages varie selon la commune et la saison : vérifiez l’arrêté municipal de la plage avant d’y aller. Tenez le chien à distance des baigneurs et des zones de nidification.",
    provenance: editorial(),
    tags: ['bretagne', 'plage', 'mer', 'réglementation', 'spot', 'baignade'],
  },
  {
    // D2 : la fusion MAT+TAG et la confiance par indicateur ne sont pas publiées
    // (aucun module runtime n'importe le moteur ELI, #118 ; Care V1 ne publie que
    // le proxy d'activation). La fiche décrit le principe, pas un état présent.
    id: 'em-eli',
    title: 'Ce qu’est ELI (non médical)',
    text: "ELI est la couche d’interprétation d’EMOPET : elle compare votre chien à ses propres références, en indiquant la qualité et la provenance des données, et s’abstient quand l’évidence est insuffisante. Ce n’est pas un outil médical : ELI ne pose aucun diagnostic. Breiz n’a pas accès aux données ELI de votre chien.",
    provenance: editorial(),
    tags: ['emopet', 'eli', 'indicateur', 'mat', 'tag', 'confiance', 'mesure'],
  },
  {
    // D2 : « 14 jours pour figer une baseline » retiré, aucune autorité contrôlée ne le fixe.
    id: 'em-baseline',
    title: 'La référence personnelle',
    text: "EMOPET compare votre chien à ses propres références (sa baseline personnelle), pas à une norme générale. Un écart notable invite à observer le contexte, jamais à formuler une évaluation vétérinaire.",
    provenance: editorial(),
    tags: ['emopet', 'baseline', 'référence', 'écart'],
  },
  {
    // D2 : la garantie « jamais partagées dans les cercles » attend la confirmation
    // du responsable vie privée ; la fiche ne la répète pas.
    id: 'em-veute',
    title: 'La Veute (communauté)',
    text: "La Veute réunit les propriétaires bretons : balades de groupe, spots partagés sur la carte, entraide entre cercles de ville.",
    provenance: editorial(),
    tags: ['communauté', 'veute', 'cercle', 'balade', 'social'],
  },
  {
    id: 'policy-veterinaire',
    title: 'Rôle du vétérinaire',
    text: "Breiz n’est pas un outil médical et ne remplace pas un vétérinaire. Pour tout signe inhabituel persistant (appétit, mobilité, comportement, respiration), prenez rendez-vous avec votre vétérinaire qui pourra examiner le contexte.",
    provenance: editorial(),
    tags: ['vétérinaire', 'médical', 'symptôme', 'consultation'],
  },
];

/** Corpus complet = statique + races (référentiel FCI réel). */
export const ALL_DOCS: KnowledgeDoc[] = [...STATIC_DOCS, ...BREED_DOCS];
