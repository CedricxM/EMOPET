/**
 * Géo-données stylisées pour la Carte Bretagne historique.
 *
 * ViewBox : 1000 × 720. Coordonnées projetées approximativement depuis
 * (lon, lat) WGS84 avec :
 *   x = (lon - (-5.2)) * 180
 *   y = (48.9 - lat) * 320
 *
 * Style sérigraphique vintage : simplification volontaire des contours,
 * pas de précision cartographique. Le but est l'évocation, pas la
 * géolocalisation.
 */

export type CityId =
  | 'lorient'
  | 'vannes'
  | 'auray'
  | 'quimper'
  | 'brest'
  | 'concarneau'
  | 'saintBrieuc'
  | 'rennes'
  | 'nantes';

export type PictoKind =
  | 'port-voilier'      // Lorient
  | 'chateau'           // Vannes, Nantes
  | 'clocher'           // Auray
  | 'cathedrale'        // Quimper
  | 'phare-bateau'      // Brest
  | 'port-peche'        // Concarneau
  | 'port-simple'       // Saint-Brieuc
  | 'porte-medievale';  // Rennes

export interface City {
  id: CityId;
  name: string;
  dept: '29' | '22' | '56' | '35' | '44';
  x: number;
  y: number;
  picto: PictoKind;
  /** Position du label texte par rapport au point (x, y). */
  labelDx: number;
  labelDy: number;
  /** Ancre du texte : start (label à droite), end (label à gauche), middle (centré). */
  anchor: 'start' | 'middle' | 'end';
}

export const CITIES: City[] = [
  { id: 'brest',       name: 'Brest',         dept: '29', x: 125, y: 168, picto: 'phare-bateau',    labelDx: 0,   labelDy: -18, anchor: 'middle' },
  { id: 'quimper',     name: 'Quimper',       dept: '29', x: 198, y: 290, picto: 'cathedrale',      labelDx: 0,   labelDy: -18, anchor: 'middle' },
  { id: 'concarneau',  name: 'Concarneau',    dept: '29', x: 230, y: 348, picto: 'port-peche',      labelDx: -12, labelDy:  20, anchor: 'end' },
  { id: 'lorient',     name: 'Lorient',       dept: '56', x: 325, y: 372, picto: 'port-voilier',    labelDx: 0,   labelDy: -18, anchor: 'middle' },
  { id: 'auray',       name: 'Auray',         dept: '56', x: 398, y: 408, picto: 'clocher',         labelDx: -8,  labelDy:  20, anchor: 'end' },
  { id: 'vannes',      name: 'Vannes',        dept: '56', x: 452, y: 416, picto: 'chateau',         labelDx: 12,  labelDy:  20, anchor: 'start' },
  { id: 'saintBrieuc', name: 'Saint-Brieuc',  dept: '22', x: 432, y: 138, picto: 'port-simple',     labelDx: 0,   labelDy: -18, anchor: 'middle' },
  { id: 'rennes',      name: 'Rennes',        dept: '35', x: 622, y: 252, picto: 'porte-medievale', labelDx: 0,   labelDy: -18, anchor: 'middle' },
  { id: 'nantes',      name: 'Nantes',        dept: '44', x: 648, y: 538, picto: 'chateau',         labelDx: 0,   labelDy: -18, anchor: 'middle' },
];

export type LighthouseId = 'eckmuhl' | 'vieille' | 'ileVierge';

export interface Lighthouse {
  id: LighthouseId;
  name: string;
  x: number;
  y: number;
  /** Histoire courte (1 ligne) pour le tooltip futur. */
  caption: string;
}

export const LIGHTHOUSES: Lighthouse[] = [
  { id: 'eckmuhl',   name: "Phare d'Eckmühl",     x: 142, y: 358, caption: '1897 · Penmarc’h · second phare le plus haut de France.' },
  { id: 'vieille',   name: 'Phare de la Vieille', x:  78, y: 280, caption: '1887 · Pointe du Raz · gardien légendaire des courants.' },
  { id: 'ileVierge', name: "Phare de l'Île Vierge", x: 108, y:  92, caption: '1902 · Plouguerneau · plus haut phare maçonné d’Europe.' },
];

export type IslandId = 'ouessant' | 'groix' | 'belleIle' | 'glenan';

export interface Island {
  id: IslandId;
  name: string;
  /** Path SVG du contour stylisé, dans le repère viewBox. */
  path: string;
  /** Position du label. */
  labelX: number;
  labelY: number;
}

export const ISLANDS: Island[] = [
  {
    id: 'ouessant',
    name: 'Ouessant',
    // Contour aplatie nord-ouest
    path: 'M 18 145 q 10 -10 28 -6 q 14 4 18 16 q 4 14 -10 20 q -16 6 -28 -2 q -14 -10 -8 -28 z',
    labelX: 32,
    labelY: 184,
  },
  {
    id: 'groix',
    name: 'Île de Groix',
    // Ovale allongé E-O au sud de Lorient
    path: 'M 290 412 q 14 -8 38 -6 q 26 2 32 10 q 6 8 -8 14 q -20 8 -42 4 q -22 -4 -20 -22 z',
    labelX: 324,
    labelY: 440,
  },
  {
    id: 'belleIle',
    name: 'Belle-Île-en-Mer',
    // Contour étiré SE de Quiberon
    path: 'M 360 502 q 18 -10 42 -6 q 22 4 28 14 q 6 12 -16 18 q -26 6 -44 -2 q -18 -10 -10 -24 z',
    labelX: 392,
    labelY: 540,
  },
  {
    id: 'glenan',
    name: 'Archipel des Glénan',
    // Petit groupe d'îlots, traités comme un cluster
    path:
      'M 196 392 a 4 4 0 1 1 8 0 a 4 4 0 1 1 -8 0 z ' +
      'M 210 388 a 3 3 0 1 1 6 0 a 3 3 0 1 1 -6 0 z ' +
      'M 204 400 a 3 3 0 1 1 6 0 a 3 3 0 1 1 -6 0 z ' +
      'M 218 396 a 2.5 2.5 0 1 1 5 0 a 2.5 2.5 0 1 1 -5 0 z',
    labelX: 220,
    labelY: 416,
  },
];

/**
 * Contour stylisé de la Bretagne historique.
 * Polygone fermé tracé dans le sens horaire depuis la pointe NW.
 * Volontairement simplifié — pas un tracé administratif.
 */
export const BRETAGNE_OUTLINE_PATH = [
  'M 50 130',          // NW Finistère (Pointe Saint-Mathieu)
  'L 130 90',          // Aber-Wrac’h
  'L 280 78',          // Côte de granit rose
  'L 460 96',          // Baie de Saint-Brieuc
  'L 620 122',         // Côte d’Émeraude
  'L 710 168',         // Saint-Malo / Rance
  'L 730 230',         // Fougères / Vitré (est)
  'L 750 350',         // Châteaubriant
  'L 770 470',         // Loire amont
  'L 745 575',         // Nantes sud
  'L 660 612',         // Estuaire Loire sud
  'L 510 612',         // Pays de Retz
  'L 380 590',         // Côte sauvage Atlantique
  'L 280 552',         // La Baule / Guérande
  'L 245 482',         // Quiberon / golfe
  'L 198 432',         // Lorient / Etel
  'L 145 396',         // Concarneau / Pont-Aven
  'L 100 348',         // Penmarc’h
  'L 50 290',          // Pointe du Raz
  'L 92 230',          // Bay of Douarnenez
  'L 135 198',         // Crozon
  'L 78 160',          // Rade de Brest
  'Z',
].join(' ');

/**
 * Bordures internes entre départements — traits sérigraphiques fins.
 */
export const DEPARTMENT_BORDERS = [
  // 29 ↔ 22/56 (vertical-ish ouest)
  'M 285 90 Q 295 250 290 555',
  // 22 ↔ 56 (horizontal-ish nord/sud du tiers ouest-central)
  'M 290 300 Q 420 295 555 300',
  // 22 ↔ 35 (vertical nord-est)
  'M 555 110 Q 560 205 555 300',
  // 56 ↔ 44 (vertical sud central)
  'M 480 305 Q 478 460 510 600',
  // 35 ↔ 44 (diagonal est)
  'M 555 300 Q 640 380 720 460',
];

export interface DepartmentLabel {
  num: '29' | '22' | '56' | '35' | '44';
  name: string;
  x: number;
  y: number;
}

export const DEPARTMENT_LABELS: DepartmentLabel[] = [
  { num: '29', name: 'Finistère',       x: 165, y: 245 },
  { num: '22', name: "Côtes-d'Armor",   x: 425, y: 200 },
  { num: '35', name: 'Ille-et-Vilaine', x: 640, y: 195 },
  { num: '56', name: 'Morbihan',        x: 380, y: 460 },
  { num: '44', name: 'Loire-Atlantique', x: 625, y: 475 },
];

/**
 * ⚠ DEMO MOCK DATA — pins chiens EMOPET.
 *
 * Distribution fictive (83 chiens, cohérent avec hypothèse pré-lancement
 * an 1). À remplacer par un appel `/api/v6/community/dogs?region=bretagne`
 * filtré par niveau de partage de l'utilisateur connecté.
 */
export interface DogPin {
  cityId: CityId;
  count: number;
  hasActive?: boolean;
  hasEvent?: boolean;
}

export const DOGS_BY_CITY: Record<CityId, DogPin> = {
  lorient:     { cityId: 'lorient',     count: 18, hasActive: true },
  vannes:      { cityId: 'vannes',      count: 12 },
  auray:       { cityId: 'auray',       count:  8 },
  quimper:     { cityId: 'quimper',     count:  7 },
  concarneau:  { cityId: 'concarneau',  count:  5, hasEvent: true },
  brest:       { cityId: 'brest',       count:  6 },
  saintBrieuc: { cityId: 'saintBrieuc', count:  4 },
  rennes:      { cityId: 'rennes',      count: 14 },
  nantes:      { cityId: 'nantes',      count:  9 },
};

export const TOTAL_DOGS = Object.values(DOGS_BY_CITY).reduce((sum, d) => sum + d.count, 0); // 83
