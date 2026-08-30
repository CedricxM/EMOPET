export type BreizSourceAccessMode =
  | 'api'
  | 'oai_pmh'
  | 'ogc'
  | 'metadata'
  | 'link_only'
  | 'manual_review';

export type BreizSourceUsagePolicy =
  | 'FULL_TEXT_ALLOWED'
  | 'METADATA_ONLY'
  | 'LINK_ONLY'
  | 'ATTRIBUTION_REQUIRED'
  | 'NON_COMMERCIAL_ONLY'
  | 'NO_DERIVATIVES'
  | 'PARTNER_PERMISSION_REQUIRED';

export type BreizSourceAuthority = 'official' | 'institutional' | 'partner' | 'community';

export interface BreizSourceDescriptor {
  id: string;
  name: string;
  publisher: string;
  canonicalUrl: string;
  territory: 'Bretagne' | 'France' | 'EU';
  accessMode: BreizSourceAccessMode;
  authority: BreizSourceAuthority;
  usagePolicy: BreizSourceUsagePolicy[];
  license: string | null;
  freshnessHours: number | null;
  enabled: boolean;
  notes: string;
}

/**
 * Registry only: inclusion here does not authorize copying content.
 * Each connector must enforce its source-specific licence/terms before ingestion.
 */
export const BREIZ_SOURCE_REGISTRY: readonly BreizSourceDescriptor[] = [
  {
    id: 'bcd-becedia',
    name: 'Bécédia',
    publisher: 'Bretagne Culture Diversité',
    canonicalUrl: 'https://www.bcd.bzh/becedia/',
    territory: 'Bretagne',
    accessMode: 'manual_review',
    authority: 'institutional',
    usagePolicy: ['ATTRIBUTION_REQUIRED', 'PARTNER_PERMISSION_REQUIRED'],
    license: null,
    freshnessHours: null,
    enabled: false,
    notes: 'Editorial knowledge source. Rights vary by item; do not bulk-scrape or vectorize full text without an explicit rights review.',
  },
  {
    id: 'bretania',
    name: 'Bretania',
    publisher: 'Bretagne Culture Diversité / contributing institutions',
    canonicalUrl: 'https://www.bretania.bzh/',
    territory: 'Bretagne',
    accessMode: 'oai_pmh',
    authority: 'institutional',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 168,
    enabled: false,
    notes: 'Federated heritage metadata. Connector must preserve institution, record URL, rights statement and Dublin Core/OAI provenance.',
  },
  {
    id: 'region-bretagne-open-data',
    name: 'Open data Région Bretagne',
    publisher: 'Région Bretagne',
    canonicalUrl: 'https://data.bretagne.bzh/',
    territory: 'Bretagne',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    enabled: true,
    notes: 'Use Explore API v2.1. Store dataset id, source update date, retrieval date and licence returned by the catalogue.',
  },
  {
    id: 'geobretagne',
    name: 'GéoBretagne',
    publisher: 'GéoBretagne partners',
    canonicalUrl: 'https://geobretagne.fr/',
    territory: 'Bretagne',
    accessMode: 'ogc',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    enabled: false,
    notes: 'OGC/INSPIRE catalogue. Preserve layer-level licence and publisher; never assume every layer shares the same reuse terms.',
  },
  {
    id: 'patrimoine-bzh',
    name: 'Patrimoine de Bretagne',
    publisher: 'Région Bretagne - Inventaire du patrimoine',
    canonicalUrl: 'https://patrimoine.bzh/',
    territory: 'Bretagne',
    accessMode: 'metadata',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 168,
    enabled: false,
    notes: 'Prefer metadata and canonical links until item-level reuse rights are verified.',
  },
  {
    id: 'pop-culture',
    name: 'POP - Plateforme ouverte du patrimoine',
    publisher: 'Ministère de la Culture',
    canonicalUrl: 'https://pop.culture.gouv.fr/',
    territory: 'France',
    accessMode: 'metadata',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 168,
    enabled: false,
    notes: 'Reuse rights differ between public data fields and protected texts/media; keep item-level rights metadata.',
  },
  {
    id: 'data-gouv-fr',
    name: 'data.gouv.fr',
    publisher: 'DINUM / French public data publishers',
    canonicalUrl: 'https://www.data.gouv.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    enabled: true,
    notes: 'Catalogue source; licence is dataset-specific and must be copied into provenance.',
  },
  {
    id: 'sirene',
    name: 'SIRENE',
    publisher: 'INSEE',
    canonicalUrl: 'https://sirene.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte / Open Licence where applicable',
    freshnessHours: 24,
    enabled: false,
    notes: 'Candidate for veterinary and pet-service directory. Apply data minimisation and do not republish restricted personal data.',
  },
  {
    id: 'datatourisme',
    name: 'DATAtourisme',
    publisher: 'French tourism open-data network',
    canonicalUrl: 'https://www.datatourisme.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'institutional',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    enabled: false,
    notes: 'Candidate for events and POIs. Respect provider- and record-level licence/attribution.',
  },
];

export function getBreizSource(id: string): BreizSourceDescriptor | undefined {
  return BREIZ_SOURCE_REGISTRY.find((source) => source.id === id);
}

export function canStoreFullText(source: BreizSourceDescriptor): boolean {
  return source.usagePolicy.includes('FULL_TEXT_ALLOWED') &&
    !source.usagePolicy.includes('NO_DERIVATIVES') &&
    !source.usagePolicy.includes('PARTNER_PERMISSION_REQUIRED');
}
