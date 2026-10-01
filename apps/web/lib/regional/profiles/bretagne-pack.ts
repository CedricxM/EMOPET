/**
 * Bretagne Regional Pack v1.
 *
 * Source bindings are candidate composition only. They do not grant reuse
 * rights, partnership status or production authority.
 */

import type { RegionalPack } from '../regional-pack';
import { BRETAGNE_KNOWLEDGE, BRETAGNE_PROFILE } from './bretagne';

export const BRETAGNE_REGIONAL_PACK: RegionalPack = {
  id: 'regional-pack-bretagne-v1',
  regionId: 'bretagne',
  profile: BRETAGNE_PROFILE,
  identityEvidence: {
    status: 'PENDING_REVIEW',
    exactAssistantName: BRETAGNE_PROFILE.assistantName,
    exactAssistantNameOrigin: BRETAGNE_PROFILE.assistantNameOrigin,
    exactNamingRule: BRETAGNE_PROFILE.namingRule,
    reviewerRole: null,
    reviewerRef: null,
    reviewedAt: null,
    reviewReceipt: null,
    note:
      'Breiz is the current controlled working identity, but its public cultural/linguistic identity has not yet received a named review receipt.',
  },
  knowledgeBase: BRETAGNE_KNOWLEDGE,
  defaultLocale: 'fr-FR',
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
      purpose:
        'Official territorial context where exact dataset-level rights and provenance are release-ready.',
    },
    {
      sourceId: 'geobretagne',
      domains: ['territorial_context'],
      purpose:
        'Geographic layers where layer-level rights, publisher and provenance are release-ready.',
    },
    {
      sourceId: 'data-gouv-fr',
      domains: ['territorial_context'],
      purpose:
        'National public-data fallback where the exact dataset licence and provenance are retained.',
    },
    {
      sourceId: 'bcd-becedia',
      domains: ['culture'],
      purpose:
        'Candidate editorial cultural source subject to explicit rights/review evidence.',
    },
    {
      sourceId: 'bretania',
      domains: ['culture', 'heritage'],
      purpose:
        'Candidate heritage metadata source subject to supported machine access and item-level rights.',
    },
    {
      sourceId: 'patrimoine-bzh',
      domains: ['culture', 'heritage'],
      purpose:
        'Candidate official heritage source with item-level rights/provenance controls.',
    },
    {
      sourceId: 'pop-culture',
      domains: ['heritage'],
      purpose:
        'Candidate national heritage metadata source with item-level rights controls.',
    },
    {
      sourceId: 'datatourisme',
      domains: ['events', 'territorial_context'],
      purpose:
        'Candidate events/POI source once exact licence, attribution, freshness and release evidence are GO.',
    },
    {
      sourceId: 'sirene',
      domains: ['services'],
      purpose:
        'Candidate professional/service directory source under data-minimisation and publication controls.',
    },
  ],
  notes: [
    'Bretagne is the first regionalisation laboratory, not the universal cultural template.',
    'No source binding is a partnership or reuse-right claim.',
    'The Breiz identity remains PENDING_REVIEW until exact naming/origin claims receive a named review receipt.',
    'The canine_network domain intentionally has no source binding yet and therefore remains a hard release blocker.',
    'Breton and Gallo are not declared supported product locales until review and cross-locale QA exist.',
  ],
};
