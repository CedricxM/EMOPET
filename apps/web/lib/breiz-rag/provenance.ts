/**
 * Provenance des fiches du corpus conversationnel Breiz (décision D1, #226).
 *
 * - `editorial` : conseil rédigé par EMOPET. Affiché « Fiche éditoriale EMOPET »,
 *   avec seulement des références bibliographiques complètes (auteur, année, titre).
 * - `dataset` : extrait d'un jeu de données de référence (ex. races FCI), dont
 *   les droits sont suivis dans le registre #116.
 * - `registry` : fait territorial de tiers. Servi seulement si la source est
 *   publiable selon le registre des droits Breiz ; sinon la fiche est ignorée
 *   (fail-closed, gate DATA-LIC-G6).
 */

import {
  getBreizSource,
  isBreizSourcePublicAnswerReady,
  type BreizSourceDescriptor,
} from '../data/breiz/sourceRegistry';

export type KnowledgeProvenance =
  | { kind: 'editorial'; references: readonly string[] }
  | { kind: 'dataset'; label: string }
  | { kind: 'registry'; sourceRegistryId: string };

export const EDITORIAL_LABEL = 'Fiche éditoriale EMOPET';

type SourceLookup = (id: string) => BreizSourceDescriptor | undefined;

function releasedSource(id: string, nowMs: number, lookup: SourceLookup): BreizSourceDescriptor | null {
  const source = lookup(id);
  return source && isBreizSourcePublicAnswerReady(source, nowMs) ? source : null;
}

/** Une fiche de tiers sans autorité de publication revue n'est jamais servie. */
export function isServable(
  provenance: KnowledgeProvenance,
  nowMs: number = Date.now(),
  lookup: SourceLookup = getBreizSource,
): boolean {
  if (provenance.kind !== 'registry') return true;
  return releasedSource(provenance.sourceRegistryId, nowMs, lookup) !== null;
}

/** Libellé affiché sous « Source », ou `null` si la fiche n'est pas publiable. */
export function sourceLabel(
  provenance: KnowledgeProvenance,
  nowMs: number = Date.now(),
  lookup: SourceLookup = getBreizSource,
): string | null {
  switch (provenance.kind) {
    case 'editorial':
      return provenance.references.length
        ? `${EDITORIAL_LABEL} · d’après ${provenance.references.join(' ; ')}`
        : EDITORIAL_LABEL;
    case 'dataset':
      return provenance.label;
    case 'registry':
      return releasedSource(provenance.sourceRegistryId, nowMs, lookup)?.rightsEvidence?.attributionText ?? null;
  }
}
