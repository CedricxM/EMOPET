import type { ItemKey, SectionKey } from './types.js';

/**
 * Event vocabulary of the fidelity audit journal.
 *
 * This list must stay identical to the `chk_event_type` constraint in the
 * instrument administration migration. A test asserts the parity against the
 * migration source, so the two cannot drift apart silently.
 */
export const AUDIT_EVENT_TYPES = [
  'assessment_opened',
  'session_planned',
  'session_invited',
  'session_opened',
  'frame_presented',
  'section_title_presented',
  'item_presented',
  'item_answered',
  'item_revised',
  'session_paused',
  'session_resumed',
  'session_closed',
  'window_expired',
  'validity_flag_raised',
  'assessment_completed',
  'assessment_invalidated',
  'scored',
  'mid_session_pause',
  'continue_offered',
  'continue_accepted',
  'continue_declined',
  'fatigue_flag_raised',
  'pause_offered',
  'reminder_sent',
  'deadline_warning_sent',
  'session_size_decided',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

/**
 * Segmentation actually experienced by one item.
 *
 * Because the item order is identical for every respondent, segmentation is the
 * only dimension that varies between administrations. Capturing it live, item by
 * item, is what turns that variability into a measurable covariate instead of
 * noise nobody can account for afterwards.
 */
export interface SegmentationCovariates {
  readonly positionInSession: number;
  readonly itemsSinceResume: number;
  readonly hoursSincePreviousItem: number | null;
  readonly crossedSectionBoundary: boolean;
  readonly isFirstItemAfterPause: boolean;
}

/**
 * One journal entry.
 *
 * There is deliberately no field on this shape that can hold wording or
 * generated prose. The only strings are opaque keys, digests and a template
 * identifier, so the journal cannot carry licensed content or durable AI text
 * even if a caller tries to put it there.
 */
export interface AuditEventInput {
  readonly eventType: AuditEventType;
  readonly occurredAt: number;
  readonly sessionIndex: number | null;
  readonly itemKey: ItemKey | null;
  readonly sectionKey: SectionKey | null;
  /** Digest of what was actually rendered. Never the rendered text. */
  readonly renderDigest: string | null;
  /** Identifier of the framing template used. Never the framing text. */
  readonly frameTemplateId: string | null;
  /** Digest of the framing that was shown. Never the framing text. */
  readonly frameDigest: string | null;
  readonly llmInvolved: boolean;
  readonly clientLatencyMs: number | null;
  readonly covariates: SegmentationCovariates | null;
  /** Machine-readable note: a flag kind, a sizing decision, a reason code. */
  readonly detailCode: string | null;
}

export interface AuditEvent extends AuditEventInput {
  readonly sequenceIndex: number;
  readonly prevEventHash: string | null;
  readonly eventHash: string;
}

export type ChainBreakReason =
  | 'bad_genesis'
  | 'sequence_gap'
  | 'content_altered'
  | 'link_broken';

export type ChainVerification =
  | { readonly status: 'VALID'; readonly eventCount: number }
  | {
      readonly status: 'BROKEN';
      readonly eventCount: number;
      /** Index in the supplied array, so the caller can point at the row. */
      readonly firstBrokenIndex: number;
      readonly sequenceIndex: number;
      readonly reason: ChainBreakReason;
      readonly detail: string;
    };
