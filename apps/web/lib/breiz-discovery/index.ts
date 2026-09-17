import type { BreizOfficialDiscovery } from '../data/breiz/connectors/types';

export type BreizDiscoveryCategory =
  | 'culture'
  | 'heritage'
  | 'territory'
  | 'event'
  | 'language'
  | 'nature'
  | 'practical';

export type BreizDiscoveryProvenance = 'CONTROLLED_FIXTURE' | 'OFFICIAL_METADATA';

export interface BreizDiscoveryContext {
  regionId?: string;
  department?: string;
  city?: string;
  month?: number;
  limit?: number;
}

export interface BreizDiscoveryScene {
  id: string;
  category: BreizDiscoveryCategory;
  title: string;
  hook: string;
  story: string;
  whyNow: string;
  territory: string;
  provenance: BreizDiscoveryProvenance;
  sourceName: string;
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  license: string | null;
  trigger: {
    regionId: string;
    departments?: readonly string[];
    cities?: readonly string[];
    months?: readonly number[];
  };
  priority: number;
}

/**
 * Controlled fixtures used by the MVP demo when live official-source discovery
 * is unavailable. They deliberately contain only facts already present in the
 * curated Bretagne witness profile / internal mock corpus.
 */
export const BREIZ_CONTROLLED_DISCOVERY_SCENES: readonly BreizDiscoveryScene[] = [
  {
    id: 'demo-lorient-port',
    category: 'territory',
    title: 'Une ville tournée vers le port',
    hook: 'Une histoire passe près de toi.',
    story:
      "Lorient est une ville portuaire du Morbihan et le point d’ancrage historique de la démo EMOPET. Breiz peut utiliser ce repère territorial pour enrichir une sortie sans en tirer de conclusion sur l’état interne du chien.",
    whyNow: 'Tu explores Lorient dans la fixture de démonstration.',
    territory: 'Lorient · Morbihan',
    provenance: 'CONTROLLED_FIXTURE',
    sourceName: 'Base régionale Breiz · geo_lorient',
    sourceUrl: null,
    sourceUpdatedAt: null,
    license: 'Fixture interne de démonstration',
    trigger: { regionId: 'bretagne', departments: ['56'], cities: ['Lorient'] },
    priority: 90,
  },
  {
    id: 'demo-festival-interceltique',
    category: 'event',
    title: 'En août, Lorient change d’échelle',
    hook: 'Le territoire a aussi son propre rythme.',
    story:
      'Le Festival Interceltique de Lorient est un grand festival des cultures celtiques organisé à Lorient en août. Dans EMOPET, ce type d’événement peut devenir une scène contextuelle : culture, affluence et exploration restent séparées des observations ELI.',
    whyNow: 'La fixture se situe à Lorient au mois d’août.',
    territory: 'Lorient · Morbihan',
    provenance: 'CONTROLLED_FIXTURE',
    sourceName: 'Base régionale Breiz · cult_fil',
    sourceUrl: null,
    sourceUpdatedAt: null,
    license: 'Fixture interne de démonstration',
    trigger: { regionId: 'bretagne', departments: ['56'], cities: ['Lorient'], months: [8] },
    priority: 100,
  },
  {
    id: 'demo-gwenn-ha-du',
    category: 'culture',
    title: 'Le Gwenn ha Du en deux mots',
    hook: 'Un symbole peut devenir un repère de voyage.',
    story:
      'Le Gwenn ha Du est le drapeau breton ; son nom signifie « blanc et noir » en breton. Breiz peut proposer ce type de micro-découverte quand le contexte régional la rend pertinente, sans forcer une référence culturelle à chaque réponse.',
    whyNow: 'Tu te trouves dans le contexte régional Bretagne de la démo.',
    territory: 'Bretagne',
    provenance: 'CONTROLLED_FIXTURE',
    sourceName: 'Base régionale Breiz · cult_gwenn_ha_du',
    sourceUrl: null,
    sourceUpdatedAt: null,
    license: 'Fixture interne de démonstration',
    trigger: { regionId: 'bretagne' },
    priority: 50,
  },
  {
    id: 'demo-breiz-name',
    category: 'language',
    title: 'Même le nom de Breiz vient du territoire',
    hook: 'Le compagnon porte déjà une petite histoire locale.',
    story:
      '« Breizh » signifie « Bretagne » en breton. Le nom Breiz conserve cet ancrage tout en restant une identité produit, pas une caricature linguistique ou folklorique.',
    whyNow: 'Cette découverte explique l’identité du compagnon régional.',
    territory: 'Bretagne',
    provenance: 'CONTROLLED_FIXTURE',
    sourceName: 'Profil régional Breiz · assistantNameOrigin',
    sourceUrl: null,
    sourceUpdatedAt: null,
    license: 'Fixture interne de démonstration',
    trigger: { regionId: 'bretagne' },
    priority: 40,
  },
] as const;

function normalize(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function matchesScene(scene: BreizDiscoveryScene, context: BreizDiscoveryContext): boolean {
  const region = normalize(context.regionId ?? 'bretagne');
  if (normalize(scene.trigger.regionId) !== region) return false;

  if (scene.trigger.departments?.length) {
    if (!context.department || !scene.trigger.departments.includes(context.department)) return false;
  }

  if (scene.trigger.cities?.length) {
    const city = normalize(context.city);
    if (!city || !scene.trigger.cities.some((candidate) => normalize(candidate) === city)) return false;
  }

  if (scene.trigger.months?.length) {
    if (!context.month || !scene.trigger.months.includes(context.month)) return false;
  }

  return true;
}

export function selectBreizControlledDiscoveries(context: BreizDiscoveryContext = {}): BreizDiscoveryScene[] {
  const safeLimit = Math.max(1, Math.min(8, context.limit ?? 4));
  return BREIZ_CONTROLLED_DISCOVERY_SCENES
    .filter((scene) => matchesScene(scene, context))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, safeLimit);
}

/**
 * Converts an official-source discovery record into a source-faithful scene.
 * No additional cultural fact is invented here: the title and summary remain
 * grounded in the upstream metadata record and provenance is preserved.
 */
export function officialDiscoveryToScene(
  discovery: BreizOfficialDiscovery,
  contextLabel = 'Découverte autour de ton trajet',
): BreizDiscoveryScene {
  return {
    id: `official-${discovery.sourceId}-${encodeURIComponent(discovery.title).slice(0, 80)}`,
    category: discovery.sourceId === 'pop-culture' ? 'heritage' : 'culture',
    title: discovery.title,
    hook: 'Breiz a trouvé une piste dans une source officielle.',
    story: discovery.summary ?? 'La source fournit une notice pertinente, mais pas assez de texte pour en raconter davantage sans extrapoler.',
    whyNow: contextLabel,
    territory: discovery.territory ?? 'Territoire non précisé par la source',
    provenance: 'OFFICIAL_METADATA',
    sourceName: discovery.sourceName,
    sourceUrl: discovery.canonicalUrl,
    sourceUpdatedAt: discovery.sourceUpdatedAt,
    license: discovery.license,
    trigger: { regionId: 'bretagne' },
    priority: 70,
  };
}
