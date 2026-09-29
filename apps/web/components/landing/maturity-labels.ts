/**
 * Couleurs des MENTIONS DE MATURITÉ de la page d'accueil, en un seul endroit.
 *
 * POURQUOI CE FICHIER EXISTE. Mesuré au navigateur sur la page servie : les onze
 * mentions de maturité de la page d'accueil échouaient toutes au contraste AA
 * (WCAG 2.2 §1.4.3). « CONCEPT VISUAL » tombait à 1,66 — un texte que l'œil ne
 * distingue pratiquement pas de son fond. Les affirmations de la page étaient
 * lisibles ; les réserves ne l'étaient pas.
 *
 * Ces libellés ne sont pas de la décoration. Ils portent la distinction que le
 * projet s'impose entre décidé, implémenté, proposé et concept. Une mention
 * illisible n'est pas un défaut esthétique, c'est une réserve qui ne parvient
 * pas au lecteur.
 *
 * CE QUI A CHANGÉ, ET CE QUI N'A PAS CHANGÉ. Seule la couleur du TEXTE bouge.
 * Les fonds des pastilles sont inchangés : c'est eux qui portent le codage
 * (vert pâle = prévu, ocre pâle = en développement), et il survit intact.
 * Les valeurs de remplacement viennent toutes de BRAND-AUTHORITY-001 — granit,
 * ardoise, pierre — aucune couleur n'a été inventée ici.
 *
 * CE QUE CE FICHIER NE FAIT PAS. Il ne corrige pas les autres textes de la page
 * d'accueil qui échouent au même critère. Ceux-là relèvent d'un arbitrage de
 * palette, pas d'une réserve rendue muette ; ils sont mesurés et rapportés, pas
 * modifiés.
 *
 * Les chaînes sont des littéraux complets, et non construits par concaténation :
 * Tailwind ne génère que les classes qu'il voit écrites.
 */

/** Pastille « PRÉVU » et bandeau d'en-tête. Granit sur vert pâle : 11,89. */
export const MATURITY_PILL_PLANNED = 'bg-[#E3EAE4] text-[#1F2A36]';

/** Pastille « EN DÉVELOPPEMENT ». Granit sur ocre pâle : 11,90. */
export const MATURITY_PILL_IN_PROGRESS = 'bg-[#F7E5DA] text-[#1F2A36]';

/** Légende « CONCEPT VISUAL » sous une maquette. Ardoise : 5,56 et 5,19. */
export const MATURITY_CAPTION = 'text-[#5A6570]';

/** Mention de maturité du pied de page, sur granit sombre. Pierre : 11,22. */
export const MATURITY_FOOTNOTE = 'text-[#D8D0C2]';

/**
 * Limite clinique : « EMOPET propose des informations, pas des diagnostics. »
 *
 * Même valeur que la légende, mais nommée à part : ce n'est pas une mention de
 * maturité, c'est la frontière non médicale du produit. Elle était à 4,03 ;
 * ardoise la porte à 5,19. Une limite de ce rang ne se lit pas « à peu près ».
 */
export const CLINICAL_BOUNDARY = 'text-[#5A6570]';
