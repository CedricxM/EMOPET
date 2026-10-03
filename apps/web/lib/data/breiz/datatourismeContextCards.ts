import type { DatatourismeBretagneLoadedEvent } from './datatourismeLoader';
import {
  getBreizSource,
  isBreizSourcePublicAnswerReady,
  type BreizSourceDescriptor,
} from './sourceRegistry';
import {
  isFresh,
  type BreizContextCard,
  type BreizSourceProvenance,
} from './sourceProvenance';

export interface DatatourismeEventCardData {
  source: 'datatourisme';
  uuid: string;
  uri: string | null;
  types: readonly string[];
  department: string;
  producerAttribution: string;
  sourceUpdatedAt: string;
  datatourismeUpdatedAt: string | null;
}

type SourceLookup = (id: string) => BreizSourceDescriptor | undefined;

export interface DatatourismeEventCardOptions {
  relevanceReason: string;
  nowMs?: number;
  sourceLookup?: SourceLookup;
}

function provenanceMatchesCurrentRights(
  provenance: BreizSourceProvenance,
  source: BreizSourceDescriptor | undefined,
  nowMs: number,
): boolean {
  if (!source || !isBreizSourcePublicAnswerReady(source, nowMs)) return false;
  const evidence = source.rightsEvidence;
  if (!evidence) return false;

  return (
    provenance.sourceId === source.id &&
    provenance.sourceName === source.name &&
    provenance.license === source.license &&
    provenance.rightsAuthorityRevision === evidence.authorityRevision &&
    provenance.rightsImmutableSourceVersion === evidence.immutableSourceVersion &&
    provenance.rightsReceiptPath === evidence.receiptPath &&
    provenance.rightsAttributionText === evidence.attributionText &&
    provenance.rightsPermittedUseSummary === evidence.permittedUseSummary &&
    provenance.rightsAllowedProductUses.length ===
      evidence.allowedProductUses.length &&
    provenance.rightsAllowedProductUses.every(
      (use, index) => use === evidence.allowedProductUses[index],
    ) &&
    provenance.rightsReviewedAt === evidence.reviewedAt &&
    provenance.rightsRecheckAt === (evidence.recheckAt ?? null) &&
    provenance.rightsReviewerRole === evidence.reviewerRole
  );
}

function provenanceMatchesEvent(
  event: DatatourismeBretagneLoadedEvent['event'],
  provenance: BreizSourceProvenance,
): boolean {
  return (
    provenance.sourceId === 'datatourisme' &&
    provenance.attribution === event.producerAttribution &&
    provenance.publisher === event.producerAttribution &&
    provenance.sourceUpdatedAt === event.sourceUpdatedAt &&
    typeof provenance.license === 'string' &&
    provenance.license.trim().length > 0
  );
}

/**
 * Convert one rights-gated DATAtourisme event into a Breiz context card.
 *
 * This transform accepts only the loader output shape and fails closed when
 * provenance no longer matches the retained event metadata or is stale.
 *
 * No description, media, contact detail, opening schedule or inferred
 * dog-friendliness is manufactured here.
 */
export function buildDatatourismeEventContextCard(
  loaded: DatatourismeBretagneLoadedEvent,
  options: DatatourismeEventCardOptions,
): BreizContextCard<DatatourismeEventCardData> | null {
  const relevanceReason = options.relevanceReason.trim();
  const nowMs = options.nowMs ?? Date.now();
  const sourceLookup = options.sourceLookup ?? getBreizSource;

  if (!relevanceReason) return null;
  if (!provenanceMatchesEvent(loaded.event, loaded.provenance)) return null;
  if (
    !provenanceMatchesCurrentRights(
      loaded.provenance,
      sourceLookup('datatourisme'),
      nowMs,
    )
  ) {
    return null;
  }
  if (!isFresh(loaded.provenance, nowMs)) return null;

  const { event, provenance } = loaded;

  return {
    id: 'datatourisme-event-' + event.uuid,
    title: event.label,
    summary:
      'Événement référencé par ' + event.producerAttribution + '. ' +
      'Donnée source mise à jour le ' + event.sourceUpdatedAt + '.',
    territory: 'Bretagne · département ' + event.department,
    relevanceReason,
    data: {
      source: 'datatourisme',
      uuid: event.uuid,
      uri: event.uri,
      types: [...event.types],
      department: event.department,
      producerAttribution: event.producerAttribution,
      sourceUpdatedAt: event.sourceUpdatedAt,
      datatourismeUpdatedAt: event.datatourismeUpdatedAt,
    },
    provenance: [provenance],
  };
}

export function buildDatatourismeEventContextCards(
  loadedEvents: readonly DatatourismeBretagneLoadedEvent[],
  options: DatatourismeEventCardOptions,
): BreizContextCard<DatatourismeEventCardData>[] {
  return loadedEvents
    .map((loaded) => buildDatatourismeEventContextCard(loaded, options))
    .filter(
      (
        card,
      ): card is BreizContextCard<DatatourismeEventCardData> => card !== null,
    );
}
