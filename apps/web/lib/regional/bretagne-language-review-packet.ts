/**
 * Bretagne language/culture review packet.
 *
 * Built directly from the runtime RegionalProfile + regional lexicon so the
 * human-review request cannot silently drift away from the exact wording that
 * EMOPET would later release.
 *
 * This packet is an outbound-review artefact only. It creates no review,
 * partnership, endorsement or language authority.
 */

import { REGIONAL_LEXICON, REGIONAL_LEXICON_REVISION } from './regional-lexicon';
import { BRETAGNE_PROFILE } from './profiles/bretagne';

export const BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION =
  'bretagne-language-review-packet-v1-2026-10-01' as const;

export type BretagneLanguageReviewPacketStatus = 'DRAFT_NOT_SENT';

export type BretagneReviewRequestedDisposition =
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REJECTED';

export interface BretagneLanguageIdentityReviewItem {
  kind: 'IDENTITY';
  itemId: 'bretagne_companion_identity';
  assistantName: string;
  assistantNameOrigin: string;
  namingRule: string;
}

export interface BretagneLanguageLexiconReviewItem {
  kind: 'LEXICON';
  itemId: string;
  term: string;
  meaningFr: string;
  usage: string;
  lexiconRevision: typeof REGIONAL_LEXICON_REVISION;
}

export interface BretagneLanguageReviewResponseTemplate {
  itemId: string;
  requestedDisposition: readonly BretagneReviewRequestedDisposition[];
  requiredFields: readonly [
    'disposition',
    'reviewer_role',
    'review_date',
    'evidence_reference',
    'approved_meaning_or_claim',
    'permitted_usage',
    'conditions_or_restrictions',
    'attribution_or_reuse_requirements',
  ];
}

export interface BretagneLanguageReviewPacket {
  packetRevision: typeof BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION;
  status: BretagneLanguageReviewPacketStatus;
  regionId: 'bretagne';
  purpose: string;
  nonGoals: readonly string[];
  identity: BretagneLanguageIdentityReviewItem;
  lexicon: readonly BretagneLanguageLexiconReviewItem[];
  responseTemplates: readonly BretagneLanguageReviewResponseTemplate[];
}

const requestedDisposition: readonly BretagneReviewRequestedDisposition[] = [
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
  'REJECTED',
];

const requiredFields = [
  'disposition',
  'reviewer_role',
  'review_date',
  'evidence_reference',
  'approved_meaning_or_claim',
  'permitted_usage',
  'conditions_or_restrictions',
  'attribution_or_reuse_requirements',
] as const;

export function buildBretagneLanguageReviewPacket(): BretagneLanguageReviewPacket {
  const lexicon = REGIONAL_LEXICON
    .filter((entry) => entry.regionId === 'bretagne')
    .map((entry) => ({
      kind: 'LEXICON' as const,
      itemId: entry.id,
      term: entry.term,
      meaningFr: entry.meaningFr,
      usage: entry.usage,
      lexiconRevision: entry.revision,
    }));

  const itemIds = ['bretagne_companion_identity', ...lexicon.map((entry) => entry.itemId)];

  return {
    packetRevision: BRETAGNE_LANGUAGE_REVIEW_PACKET_REVISION,
    status: 'DRAFT_NOT_SENT',
    regionId: 'bretagne',
    purpose:
      'Obtenir une relecture linguistique/culturelle bornée des claims exacts utilisés par le compagnon régional Bretagne.',
    nonGoals: [
      'Aucune validation scientifique ou médicale d’ELI.',
      'Aucun endorsement ou partenariat implicite.',
      'Aucune autorisation générale de réutiliser des ressources linguistiques.',
      'Aucune traduction intégrale de l’application.',
    ],
    identity: {
      kind: 'IDENTITY',
      itemId: 'bretagne_companion_identity',
      assistantName: BRETAGNE_PROFILE.assistantName,
      assistantNameOrigin: BRETAGNE_PROFILE.assistantNameOrigin,
      namingRule: BRETAGNE_PROFILE.namingRule,
    },
    lexicon,
    responseTemplates: itemIds.map((itemId) => ({
      itemId,
      requestedDisposition,
      requiredFields,
    })),
  };
}

export function auditBretagneLanguageReviewPacket(
  packet: BretagneLanguageReviewPacket = buildBretagneLanguageReviewPacket(),
): string[] {
  const errors: string[] = [];

  if (packet.status !== 'DRAFT_NOT_SENT') {
    errors.push('packet status must remain DRAFT_NOT_SENT in repository authority');
  }
  if (packet.regionId !== 'bretagne') {
    errors.push('packet regionId mismatch');
  }

  if (packet.identity.assistantName !== BRETAGNE_PROFILE.assistantName) {
    errors.push('identity assistantName drift');
  }
  if (
    packet.identity.assistantNameOrigin !==
    BRETAGNE_PROFILE.assistantNameOrigin
  ) {
    errors.push('identity assistantNameOrigin drift');
  }
  if (packet.identity.namingRule !== BRETAGNE_PROFILE.namingRule) {
    errors.push('identity namingRule drift');
  }

  const runtimeLexicon = REGIONAL_LEXICON.filter(
    (entry) => entry.regionId === 'bretagne',
  );
  const packetById = new Map(packet.lexicon.map((entry) => [entry.itemId, entry]));

  if (packet.lexicon.length !== runtimeLexicon.length) {
    errors.push('lexicon item count drift');
  }

  for (const runtime of runtimeLexicon) {
    const item = packetById.get(runtime.id);
    if (!item) {
      errors.push(runtime.id + ': missing review item');
      continue;
    }

    if (item.term !== runtime.term) {
      errors.push(runtime.id + ': term drift');
    }
    if (item.meaningFr !== runtime.meaningFr) {
      errors.push(runtime.id + ': meaningFr drift');
    }
    if (item.usage !== runtime.usage) {
      errors.push(runtime.id + ': usage drift');
    }
    if (item.lexiconRevision !== runtime.revision) {
      errors.push(runtime.id + ': revision drift');
    }
  }

  const expectedTemplateIds = new Set([
    'bretagne_companion_identity',
    ...runtimeLexicon.map((entry) => entry.id),
  ]);
  const actualTemplateIds = packet.responseTemplates.map((entry) => entry.itemId);

  if (
    actualTemplateIds.length !== expectedTemplateIds.size ||
    new Set(actualTemplateIds).size !== actualTemplateIds.length
  ) {
    errors.push('response template item coverage is not one-to-one');
  }

  for (const itemId of expectedTemplateIds) {
    if (!actualTemplateIds.includes(itemId)) {
      errors.push(itemId + ': missing response template');
    }
  }

  return errors;
}
