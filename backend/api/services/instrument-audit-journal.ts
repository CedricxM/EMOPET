import { createHash } from 'node:crypto';

import {
  AUDIT_EVENT_TYPES,
  type AuditEvent,
  type AuditEventInput,
  type AuditEventType,
  type ChainVerification,
  type ItemKey,
  type RecordedResponse,
  type SectionKey,
  type SegmentationCovariates,
} from '@emopet/shared';

/**
 * Append-only fidelity audit journal.
 *
 * Two properties matter, and both are demonstrable rather than asserted.
 *
 * Fidelity: an `item_presented` entry always carries the digest of what was
 * rendered and always attests that no model was in the loop. The same rules the
 * database enforces are enforced here, before a row is ever built, so an illegal
 * entry cannot be constructed in the first place.
 *
 * Tamper evidence: every entry is hashed over its own content plus the previous
 * entry's hash. Altering an entry, removing one, or reordering two breaks the
 * chain at a position the verifier can name.
 *
 * The journal holds no wording and no generated prose. It records that a framing
 * from template `FRAME_OPEN_03` was shown, and the digest proving which one — not
 * the sentence. That keeps a complete audit trail compatible with the rule that
 * AI conversational content is never durably persisted.
 */

export class AuditJournalError extends Error {
  readonly code = 'INSTRUMENT_AUDIT_EVENT_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'AuditJournalError';
  }
}

const FIELD_SEPARATOR = '\u001F';

function fail(message: string): never {
  throw new AuditJournalError(message);
}

/**
 * Canonical projection of an entry, used as the hash input.
 *
 * Every semantic field is included, the covariates among them. Hashing only the
 * event type and timestamps would leave exactly the data the segmentation
 * analysis depends on unprotected: someone could rewrite `positionInSession`
 * afterwards and the chain would still verify, which would make the covariates
 * worthless as evidence.
 */
function canonicalFields(
  event: AuditEventInput,
  sequenceIndex: number,
  prevEventHash: string | null,
): readonly string[] {
  const covariates = event.covariates;
  return [
    String(sequenceIndex),
    prevEventHash ?? '',
    event.eventType,
    String(event.occurredAt),
    event.sessionIndex === null ? '' : String(event.sessionIndex),
    event.itemKey ?? '',
    event.sectionKey ?? '',
    event.renderDigest ?? '',
    event.frameTemplateId ?? '',
    event.frameDigest ?? '',
    String(event.llmInvolved),
    event.clientLatencyMs === null ? '' : String(event.clientLatencyMs),
    event.detailCode ?? '',
    covariates === null ? '' : String(covariates.positionInSession),
    covariates === null ? '' : String(covariates.itemsSinceResume),
    covariates === null || covariates.hoursSincePreviousItem === null
      ? ''
      : covariates.hoursSincePreviousItem.toFixed(6),
    covariates === null ? '' : String(covariates.crossedSectionBoundary),
    covariates === null ? '' : String(covariates.isFirstItemAfterPause),
  ];
}

export function computeEventHash(
  event: AuditEventInput,
  sequenceIndex: number,
  prevEventHash: string | null,
): string {
  return createHash('sha256')
    .update(canonicalFields(event, sequenceIndex, prevEventHash).join(FIELD_SEPARATOR), 'utf8')
    .digest('hex');
}

// ── Invariants, mirroring the database constraints ──────────────────

/**
 * Reject an entry the database would reject.
 *
 * The constraint names are quoted in the messages on purpose: when this throws in
 * development, the message points at the same rule that would have rejected the
 * row in PostgreSQL, so the two layers are visibly the same rule rather than two
 * similar ones.
 */
export function assertEventAllowed(event: AuditEventInput): void {
  if (!(AUDIT_EVENT_TYPES as readonly string[]).includes(event.eventType)) {
    fail(`chk_event_type: unknown event type '${event.eventType}'`);
  }

  if (event.eventType === 'item_presented') {
    if (event.renderDigest === null || event.itemKey === null || event.llmInvolved) {
      fail(
        'chk_event_item_presentation: an item presentation requires a render digest and an '
          + 'item key, and must attest that no model was in the loop',
      );
    }
  }

  if (event.eventType === 'section_title_presented') {
    if (event.renderDigest === null || event.llmInvolved) {
      fail(
        'chk_event_section_title: a section title presentation requires a render digest and '
          + 'must attest that no model was in the loop',
      );
    }
  }

  if (event.occurredAt <= 0 || !Number.isFinite(event.occurredAt)) {
    fail(`occurredAt must be a positive timestamp, got ${event.occurredAt}`);
  }
}

// ── The journal ─────────────────────────────────────────────────────

export class AuditJournal {
  private readonly events: AuditEvent[] = [];

  /** Entries in order. A copy, so the journal cannot be mutated from outside. */
  entries(): readonly AuditEvent[] {
    return [...this.events];
  }

  get length(): number {
    return this.events.length;
  }

  headHash(): string | null {
    const last = this.events[this.events.length - 1];
    return last === undefined ? null : last.eventHash;
  }

  /**
   * Append one entry.
   *
   * Timestamps must not go backwards: a journal whose order contradicts its own
   * clock cannot support a claim about the order items were presented in.
   */
  append(input: AuditEventInput): AuditEvent {
    assertEventAllowed(input);

    const previous = this.events[this.events.length - 1];
    if (previous !== undefined && input.occurredAt < previous.occurredAt) {
      fail(
        `Journal is append-only in time: event at ${input.occurredAt} precedes `
          + `sequence ${previous.sequenceIndex} at ${previous.occurredAt}`,
      );
    }

    const sequenceIndex = this.events.length;
    const prevEventHash = previous === undefined ? null : previous.eventHash;
    const event: AuditEvent = {
      ...input,
      sequenceIndex,
      prevEventHash,
      eventHash: computeEventHash(input, sequenceIndex, prevEventHash),
    };

    this.events.push(event);
    return event;
  }
}

/** Build an entry with the nullable fields defaulted, to keep call sites short. */
export function auditEvent(
  eventType: AuditEventType,
  occurredAt: number,
  overrides: Partial<Omit<AuditEventInput, 'eventType' | 'occurredAt'>> = {},
): AuditEventInput {
  return {
    eventType,
    occurredAt,
    sessionIndex: null,
    itemKey: null,
    sectionKey: null,
    renderDigest: null,
    frameTemplateId: null,
    frameDigest: null,
    llmInvolved: false,
    clientLatencyMs: null,
    covariates: null,
    detailCode: null,
    ...overrides,
  };
}

/** Covariates as recorded live by the engine, carried through unchanged. */
export function covariatesOf(response: RecordedResponse): SegmentationCovariates {
  return {
    positionInSession: response.positionInSession,
    itemsSinceResume: response.itemsSinceResume,
    hoursSincePreviousItem: response.hoursSincePreviousItem,
    crossedSectionBoundary: response.crossedSectionBoundary,
    isFirstItemAfterPause: response.isFirstItemAfterPause,
  };
}

export function itemPresentedEvent(
  occurredAt: number,
  sessionIndex: number,
  itemKey: ItemKey,
  renderDigest: string,
  sectionKey: SectionKey | null,
): AuditEventInput {
  return auditEvent('item_presented', occurredAt, {
    sessionIndex,
    itemKey,
    sectionKey,
    renderDigest,
    // Stated explicitly rather than left to the default: this is the attestation
    // the fidelity claim rests on, so it should be visible at every call site.
    llmInvolved: false,
  });
}

export function itemAnsweredEvent(
  sessionIndex: number,
  response: RecordedResponse,
): AuditEventInput {
  return auditEvent('item_answered', response.answeredAt, {
    sessionIndex,
    itemKey: response.itemKey,
    clientLatencyMs: response.latencyMs,
    covariates: covariatesOf(response),
    detailCode: response.status,
  });
}

// ── Verification ────────────────────────────────────────────────────

/**
 * Verify the chain and, when it is broken, name where and how.
 *
 * The distinction between an altered entry and a broken link is what makes the
 * result useful: `content_altered` says this row was rewritten, while
 * `link_broken` or `sequence_gap` says a row was removed or reordered. A verifier
 * that only answered "invalid" would leave the reader unable to tell tampering
 * from truncation.
 *
 * Deliberately a free function over an array rather than a method: verification
 * must work on rows read back from the database by someone who does not trust the
 * process that wrote them, which is the only situation in which it matters.
 */
export function verifyChain(events: readonly AuditEvent[]): ChainVerification {
  if (events.length === 0) return { status: 'VALID', eventCount: 0 };

  let expectedPrevHash: string | null = null;

  for (const [index, event] of events.entries()) {
    if (event.sequenceIndex !== index) {
      return {
        status: 'BROKEN',
        eventCount: events.length,
        firstBrokenIndex: index,
        sequenceIndex: event.sequenceIndex,
        reason: 'sequence_gap',
        detail: `expected sequence ${index}, found ${event.sequenceIndex}`,
      };
    }

    if (event.prevEventHash !== expectedPrevHash) {
      return {
        status: 'BROKEN',
        eventCount: events.length,
        firstBrokenIndex: index,
        sequenceIndex: event.sequenceIndex,
        reason: index === 0 ? 'bad_genesis' : 'link_broken',
        detail:
          index === 0
            ? 'the first entry must carry no previous hash'
            : `previous hash does not match sequence ${index - 1}`,
      };
    }

    const recomputed = computeEventHash(event, event.sequenceIndex, event.prevEventHash);
    if (recomputed !== event.eventHash) {
      return {
        status: 'BROKEN',
        eventCount: events.length,
        firstBrokenIndex: index,
        sequenceIndex: event.sequenceIndex,
        reason: 'content_altered',
        detail: `recomputed ${recomputed.slice(0, 12)}… does not match stored ${event.eventHash.slice(0, 12)}…`,
      };
    }

    expectedPrevHash = event.eventHash;
  }

  return { status: 'VALID', eventCount: events.length };
}

// ── Reporting ───────────────────────────────────────────────────────

export interface SegmentationRow {
  readonly itemKey: string;
  readonly positionInSession: number;
  readonly itemsSinceResume: number;
  readonly hoursSincePreviousItem: number | null;
  readonly crossedSectionBoundary: boolean;
  readonly isFirstItemAfterPause: boolean;
}

/**
 * The segmentation covariates, one row per answered item.
 *
 * This is the table the segmentation-effect analysis consumes, and the thing
 * worth putting in front of an instrument owner: it shows the variability being
 * measured rather than promising it is negligible.
 */
export function segmentationTable(events: readonly AuditEvent[]): readonly SegmentationRow[] {
  const rows: SegmentationRow[] = [];
  for (const event of events) {
    if (event.eventType !== 'item_answered' || event.covariates === null) continue;
    rows.push({
      itemKey: event.itemKey ?? '',
      positionInSession: event.covariates.positionInSession,
      itemsSinceResume: event.covariates.itemsSinceResume,
      hoursSincePreviousItem: event.covariates.hoursSincePreviousItem,
      crossedSectionBoundary: event.covariates.crossedSectionBoundary,
      isFirstItemAfterPause: event.covariates.isFirstItemAfterPause,
    });
  }
  return rows;
}

export interface FidelityReport {
  readonly chain: ChainVerification;
  readonly itemsPresented: number;
  readonly itemsAnswered: number;
  /** Presentations that carried a render digest and attested no model. */
  readonly itemPresentationsProven: number;
  readonly sectionTitlesProven: number;
  /** Entries where a model was in the loop. Framing only, never an item. */
  readonly llmInvolvedEvents: number;
  readonly llmInvolvedEventTypes: readonly string[];
}

/**
 * What the audit trail proves about one administration.
 *
 * `llmInvolvedEventTypes` is the interesting line: it should only ever contain
 * framing events. If an item or a section title appeared there the chain would
 * have been built in violation of its own invariants, which is why the count and
 * the type list are reported together rather than separately.
 */
export function fidelityReport(events: readonly AuditEvent[]): FidelityReport {
  const presented = events.filter((event) => event.eventType === 'item_presented');
  const titles = events.filter((event) => event.eventType === 'section_title_presented');
  const llm = events.filter((event) => event.llmInvolved);

  return {
    chain: verifyChain(events),
    itemsPresented: presented.length,
    itemsAnswered: events.filter((event) => event.eventType === 'item_answered').length,
    itemPresentationsProven: presented.filter(
      (event) => event.renderDigest !== null && event.itemKey !== null && !event.llmInvolved,
    ).length,
    sectionTitlesProven: titles.filter(
      (event) => event.renderDigest !== null && !event.llmInvolved,
    ).length,
    llmInvolvedEvents: llm.length,
    llmInvolvedEventTypes: [...new Set(llm.map((event) => event.eventType))].sort(),
  };
}
