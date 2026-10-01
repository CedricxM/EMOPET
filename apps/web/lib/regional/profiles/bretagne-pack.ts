/**
 * Bretagne Regional Pack.
 *
 * This is a composition layer over existing authorities. Listing a source here
 * means "candidate for this data domain", never "approved for ingestion" and
 * never "partner".
 */

import type { RegionalPack } from '../regional-pack';
import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from './bretagne';

export const BRETAGNE_REGIONAL_PACK: RegionalPack = {
  id: 'regional-pack-bretagne-v0',
  regionId: 'bretagne',
  profile: BRETAGNE_PROFILE,
  knowledgeBase: BRETAGNE_KNOWLEDGE,
  defaultLocale: 'fr-FR',
  // Breton/Gallo are intentionally not advertised as supported locales until
  // named linguistic review and product-level locale coverage exist.
  supportedLocales: ['fr-FR'],
  requiredDataDomains: [
    'territorial_context',
    'culture',
    'events',
    'canine_network',
  ],
  sourceBindings: [
    {
      sourceId: 'region-bretagne-open-data',
      domains: ['territorial_context'],
      purpose: 'Official territorial/open-data context where dataset-level rights and provenance are release-ready.',
    },
    {
      sourceId: 'geobretagne',
      domains: ['territorial_context'],
      purpose: 'Geographic layers where exact layer rights, publisher and provenance are release-ready.',
    },
    {
      sourceId: 'data-gouv-fr',
      domains: ['territorial_context'],
      purpose: 'National public-data catalogue fallback with dataset-specific provenance.',
    },
    {
      sourceId: 'bcd-becedia',
      domains: ['culture'],
      purpose: 'Candidate editorial cultural source subject to explicit item/use permission.',
    },
    {
      sourceId: 'bretania',
      domains: ['culture', 'heritage'],
      purpose: 'Candidate heritage metadata source subject to exact machine-access and item-level rights.',
    },
    {
      sourceId: 'patrimoine-bzh',
      domains: ['culture', 'heritage'],
      purpose: 'Candidate official heritage metadata source with item-level rights controls.',
    },
    {
      sourceId: 'pop-culture',
      domains: ['heritage'],
      purpose: 'Candidate national heritage metadata source with item-level rights controls.',
    },
    {
      sourceId: 'datatourisme',
      domains: ['events', 'territorial_context'],
      purpose: 'Candidate events/POI source once API access, attribution and record-level rights are evidenced.',
    },
    {
      sourceId: 'act-bretagne-clubs',
      domains: ['canine_network'],
      purpose: 'Candidate canine-club network source/relationship; link/reference use only until exact written rights and update rules are evidenced.',
    },
    {
      sourceId: 'sirene',
      domains: ['services'],
      purpose: 'Candidate directory source for eligible professional/service records under data-minimisation rules.',
    },
  ],
  notes: [
    'Bretagne is the first regionalisation laboratory, not a universal cultural template.',
    'No source binding is a partnership claim or reuse authorisation.',
    'The canine-network binding is a candidate source/relationship only; club/association data stays blocked until controlled provenance or written access terms exist.',
    'Breton and Gallo language support remains a review/data workstream, not a shipped locale claim.',
  ],
};
