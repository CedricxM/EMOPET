export type BreizSourceAccessMode =
  | 'api'
  | 'oai_pmh'
  | 'sru'
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
export type BreizSourceCostModel = 'free_public' | 'free_account' | 'partner_quote' | 'unknown';
export type BreizSourceConnectionStatus =
  | 'connected_candidate'
  | 'ready_no_key'
  | 'ready_after_signup'
  | 'metadata_only'
  | 'partner_review';

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
  costModel: BreizSourceCostModel;
  publishedPriceEurMonthly: number | null;
  signupRequired: boolean;
  credentialEnv: string | null;
  connectionStatus: BreizSourceConnectionStatus;
  enabled: boolean;
  notes: string;
}

/**
 * Inclusion here does not authorize copying content.
 * Each connector must enforce source/item-specific licence and rights before ingestion.
 * `publishedPriceEurMonthly: 0` means the source documents free access; it is not
 * an estimate of EMOPET hosting, model, storage or egress costs.
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
    costModel: 'partner_quote',
    publishedPriceEurMonthly: null,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'partner_review',
    enabled: false,
    notes: 'Editorial source. No public integration tariff identified. Rights vary by item; do not bulk-scrape or vectorize full text without explicit permission.',
  },
  {
    id: 'bretania',
    name: 'Bretania',
    publisher: 'Bretagne Culture Diversité / contributing institutions',
    canonicalUrl: 'https://www.bretania.bzh/',
    territory: 'Bretagne',
    accessMode: 'manual_review',
    authority: 'institutional',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED', 'PARTNER_PERMISSION_REQUIRED'],
    license: null,
    freshnessHours: 168,
    costModel: 'partner_quote',
    publishedPriceEurMonthly: null,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'partner_review',
    enabled: false,
    notes: 'BCD offers a customizable widget and integration support. OAI-PMH is used in aggregation workflows, but a public third-party Bretania OAI endpoint is not yet verified.',
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
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'ready_no_key',
    enabled: true,
    notes: 'Explore API v2.1. Preserve dataset id, publisher, source update/retrieval dates and the dataset-specific licence.',
  },
  {
    id: 'geobretagne',
    name: 'GéoBretagne',
    publisher: 'GéoBretagne partners',
    canonicalUrl: 'https://geobretagne.fr/',
    territory: 'Bretagne',
    accessMode: 'ogc',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'ready_no_key',
    enabled: true,
    notes: 'Public CSW/OGC catalogue. Preserve layer-level licence and publisher; never assume every layer shares the same reuse terms.',
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
    license: 'Public information reusable subject to source/update-date requirements; other content may remain copyrighted',
    freshnessHours: 168,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'metadata_only',
    enabled: false,
    notes: 'Public information may be reused if not altered/distorted and with source + last update date. Keep metadata/link-only until a stable machine feed is verified.',
  },
  {
    id: 'pop-culture',
    name: 'POP / data.culture.gouv.fr',
    publisher: 'Ministère de la Culture',
    canonicalUrl: 'https://data.culture.gouv.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['ATTRIBUTION_REQUIRED'],
    license: 'Free reuse for qualifying public information; underlying copyrighted texts/media remain separate',
    freshnessHours: 168,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'ready_no_key',
    enabled: true,
    notes: 'Use Opendatasoft API datasets for public heritage/cultural metadata. Do not infer rights to protected images/media from metadata availability.',
  },
  {
    id: 'data-gouv-fr',
    name: 'data.gouv.fr',
    publisher: 'DINUM / French public data publishers',
    canonicalUrl: 'https://www.data.gouv.fr/',
    territory: 'France',
    accessMode: 'api',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: null,
    freshnessHours: 24,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'ready_no_key',
    enabled: true,
    notes: 'Open catalogue read API at /api/1. Dataset/resource licence is specific and must be propagated into provenance.',
  },
  {
    id: 'bnf-gallica',
    name: 'BnF / Gallica metadata',
    publisher: 'Bibliothèque nationale de France',
    canonicalUrl: 'https://gallica.bnf.fr/',
    territory: 'France',
    accessMode: 'sru',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte / Open Licence for descriptive metadata',
    freshnessHours: 168,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'ready_no_key',
    enabled: true,
    notes: 'SRU/OAI metadata reuse is free with source and retrieval date preserved. Underlying digitised content/media may have different rights.',
  },
  {
    id: 'francearchives',
    name: 'FranceArchives',
    publisher: 'Service interministériel des Archives de France / partners',
    canonicalUrl: 'https://francearchives.gouv.fr/',
    territory: 'France',
    accessMode: 'metadata',
    authority: 'official',
    usagePolicy: ['METADATA_ONLY', 'ATTRIBUTION_REQUIRED'],
    license: 'Licence Ouverte for published partnership datasets where stated',
    freshnessHours: 168,
    costModel: 'free_public',
    publishedPriceEurMonthly: 0,
    signupRequired: false,
    credentialEnv: null,
    connectionStatus: 'metadata_only',
    enabled: false,
    notes: 'Open datasets are free; select a stable downloadable/API resource before enabling. Archives may include personal-data constraints.',
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
    costModel: 'free_account',
    publishedPriceEurMonthly: 0,
    signupRequired: true,
    credentialEnv: 'INSEE_API_TOKEN',
    connectionStatus: 'ready_after_signup',
    enabled: false,
    notes: 'Open-data API requires an INSEE account/subscription; documented quota is 30 requests/minute. Apply data minimisation and partial-diffusion rules.',
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
    license: 'Licence Ouverte 2.0',
    freshnessHours: 24,
    costModel: 'free_account',
    publishedPriceEurMonthly: 0,
    signupRequired: true,
    credentialEnv: 'DATATOURISME_API_KEY',
    connectionStatus: 'ready_after_signup',
    enabled: false,
    notes: 'Free API key. Preserve HasBeenCreatedBy and last-update attribution. Current quotas: 1000 req/hour, 20–30 concurrent, ~10 req/s sustained.',
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
