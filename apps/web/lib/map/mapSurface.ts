/**
 * État de la surface carte — « pas configuré », « indisponible » et « vide »
 * sont trois choses différentes.
 *
 * `CommunityMap` choisissait la carte Mapbox sur `!!process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
 * et `MapboxMap` se gardait sur `!token`. Les deux prédicats acceptaient un
 * token composé d'espaces, et surtout aucune erreur Mapbox n'était écoutée :
 * un jeton invalide, révoqué, hors quota, ou un service injoignable ne
 * produisaient aucun `load`, donc aucun message. L'utilisateur voyait un
 * rectangle bordé de 480 px, indéfiniment, sans explication.
 *
 * La doctrine Care impose l'inverse : quand l'évidence manque, l'afficher.
 * Le gate DATA-LIC-G5 de #116 laisse par ailleurs la garde et la rotation du
 * jeton Mapbox ouvertes — un jeton révoqué n'est donc pas un cas théorique.
 *
 * La logique vit ici, dans `lib/`, parce que c'est ce que le harnais de tests
 * du web collecte (`lib/**\/*.test.ts`) ; les branches de rendu `.tsx` ne sont
 * pas couvertes par l'outillage existant.
 */

/** Le jeton est utilisable, ou il ne l'est pas — et l'on sait pourquoi. */
export type MapboxTokenResolution =
  | { status: 'configured'; token: string }
  | { status: 'unconfigured'; reason: 'missing' | 'blank' };

/**
 * `!!token` acceptait `' '`. Un jeton fait uniquement d'espaces passait donc le
 * garde de `CommunityMap`, qui renonçait au repli SVG, puis passait celui de
 * `MapboxMap` : la carte s'initialisait avec un jeton vide et échouait en
 * silence. Les espaces sont ici un `unconfigured` comme un autre.
 */
export function resolveMapboxToken(raw: string | undefined | null): MapboxTokenResolution {
  if (raw === undefined || raw === null || raw === '') return { status: 'unconfigured', reason: 'missing' };
  const token = raw.trim();
  if (token === '') return { status: 'unconfigured', reason: 'blank' };
  return { status: 'configured', token };
}

/**
 * Ce que la surface carte peut être en train de montrer.
 *
 * `unavailable` n'est pas `unconfigured` : l'un dit que le service n'a pas
 * répondu, l'autre qu'aucun service n'a été configuré. Les confondre reviendrait
 * à présenter une panne comme un choix, ou l'inverse.
 */
export type MapSurfaceState = 'ready' | 'unconfigured' | 'unavailable';

/**
 * Message utilisateur pour un état non nominal.
 *
 * Aucun de ces textes n'affirme qu'il n'existe pas de lieux : ils parlent de la
 * carte, jamais des données. C'est la même distinction que `osm-spots.ts`
 * maintient déjà entre « source indisponible » et « aucun POI ».
 */
export function describeMapSurface(state: Exclude<MapSurfaceState, 'ready'>): string {
  switch (state) {
    case 'unconfigured':
      return "Carte interactive non configurée sur cet environnement. La carte simplifiée reste disponible.";
    case 'unavailable':
      return "Carte interactive indisponible pour le moment. Ce n'est pas une absence de lieux : le fond de carte n'a pas répondu.";
  }
}
