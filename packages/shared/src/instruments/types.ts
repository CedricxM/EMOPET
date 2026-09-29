/**
 * Types for licensed behavioural instrument content.
 *
 * The whole point of this file is to make one rule checkable by the compiler:
 * licensed wording and generated text never share a pipe. It does that by
 * splitting the vocabulary in two.
 *
 * - `InstrumentReference` and `InstrumentProgressCounters` are opaque. They carry
 *   identifiers and counts, never wording, and they are the ONLY shapes a prompt
 *   builder accepts. A model that has never received the wording cannot rephrase
 *   it.
 * - `SealedItemPayload` and `SealedTitlePayload` carry the licensed wording. They
 *   travel straight from the private content store to a frozen rendering
 *   component and must never appear in a model call, a log line, an error
 *   payload, or a database column.
 *
 * The brands below are not decoration: a plain `string` cannot be passed where an
 * `ItemKey` is expected, so the two vocabularies cannot be mixed by accident.
 */

declare const itemKeyBrand: unique symbol;
declare const sectionKeyBrand: unique symbol;
declare const subscaleKeyBrand: unique symbol;
declare const versionRefBrand: unique symbol;

/** Opaque item identifier, e.g. `DEMO_ITEM_01`. Never the wording. */
export type ItemKey = string & { readonly [itemKeyBrand]: 'ItemKey' };

/** Opaque section identifier, e.g. `DEMO_SECTION_A`. */
export type SectionKey = string & { readonly [sectionKeyBrand]: 'SectionKey' };

/** Opaque scoring-subscale identifier. A subscale is not a section. */
export type SubscaleKey = string & { readonly [subscaleKeyBrand]: 'SubscaleKey' };

/**
 * Stable identity of an instrument version: `code:version:locale`.
 *
 * Digests are computed against this rather than against a database row id, so
 * they can be computed when the licensed bundle is ingested, recomputed before
 * every presentation, and compared across environments and reseeds.
 */
export type VersionRef = string & { readonly [versionRefBrand]: 'VersionRef' };

export function asItemKey(value: string): ItemKey {
  return value as ItemKey;
}

export function asSectionKey(value: string): SectionKey {
  return value as SectionKey;
}

export function asSubscaleKey(value: string): SubscaleKey {
  return value as SubscaleKey;
}

export function buildVersionRef(code: string, version: string, locale: string): VersionRef {
  return `${code}:${version}:${locale}` as VersionRef;
}

// ── Opaque surface: what an LLM may receive ──────────────────────────

/**
 * The most an LLM is ever told about an item: which item, and where it sits.
 * No wording, no scale labels, no response value.
 */
export interface InstrumentReference {
  readonly itemKey: ItemKey;
  readonly subscaleKey: SubscaleKey | null;
  readonly sectionKey: SectionKey | null;
}

/** Progress only. Never a response value, never a score. */
export interface InstrumentProgressCounters {
  readonly sessionIndex: number;
  readonly itemsDoneInSession: number;
  readonly itemsPlannedInSession: number;
  readonly itemsDoneTotal: number;
  readonly itemsExpectedTotal: number;
}

/**
 * The complete input a Breiz framing turn may receive. Deliberately has no field
 * that could hold wording or an answer, so the framing builder cannot leak either
 * even if someone tries.
 */
export interface InstrumentPromptContext {
  readonly counters: InstrumentProgressCounters;
  readonly dogName: string;
  readonly reference: InstrumentReference | null;
}

// ── Sealed surface: licensed content, channel B only ─────────────────

/**
 * Licensed item content, sealed for direct rendering.
 *
 * NEVER pass this to a prompt builder, a logger, an error serialiser, or a
 * database write. It goes from the private content store to the frozen item card
 * and nowhere else.
 */
export interface SealedItemPayload {
  readonly itemKey: ItemKey;
  readonly subscaleKey: SubscaleKey | null;
  readonly canonicalPosition: number;
  /** Licensed wording, rendered verbatim. */
  readonly text: string;
  /** Licensed scale labels, rendered verbatim and in order. */
  readonly scaleLabels: readonly string[];
  readonly scaleType: string;
  readonly scaleMin: number;
  readonly scaleMax: number;
  readonly allowsNotApplicable: boolean;
  readonly reverseScored: boolean;
  /** Recomputed server-side before presentation; a mismatch refuses the item. */
  readonly renderDigest: string;
}

/** Licensed official section title. Same handling rules as an item. */
export interface SealedTitlePayload {
  readonly sectionKey: SectionKey;
  readonly ordinal: number;
  readonly firstPosition: number;
  readonly lastPosition: number;
  /** Licensed wording, rendered verbatim. */
  readonly title: string;
  readonly titleRenderDigest: string;
}

// ── Structure: safe to persist and to reason about ───────────────────

/** Item structure without any wording. This is what the database stores. */
export interface InstrumentItemStructure {
  readonly itemKey: ItemKey;
  readonly subscaleKey: SubscaleKey | null;
  readonly canonicalPosition: number;
  readonly scaleType: string;
  readonly scaleMin: number;
  readonly scaleMax: number;
  readonly allowsNotApplicable: boolean;
  readonly reverseScored: boolean;
  readonly renderDigest: string;
}

export interface InstrumentSectionStructure {
  readonly sectionKey: SectionKey;
  readonly ordinal: number;
  readonly firstPosition: number;
  readonly lastPosition: number;
  readonly titleRenderDigest: string;
}

export type BreakpointKind = 'section_boundary' | 'intra_section';
export type BreakpointAuthority = 'licensed' | 'emopet_proposed' | 'emopet_approved';

export interface InstrumentBreakpointStructure {
  readonly afterPosition: number;
  readonly breakpointKind: BreakpointKind;
  readonly authority: BreakpointAuthority;
}

export type InstrumentLicenseStatus =
  | 'not_proven'
  | 'granted'
  | 'expired'
  | 'revoked'
  | 'demo_only';

export type InstrumentTranslationStatus =
  | 'unreviewed'
  | 'official'
  | 'back_translated'
  | 'not_equivalent';

/**
 * Everything about a version that is safe to hold outside the private store:
 * identity, structure and digests, but no wording.
 */
export interface InstrumentVersionStructure {
  readonly versionRef: VersionRef;
  readonly instrumentCode: string;
  readonly version: string;
  readonly locale: string;
  readonly licenseStatus: InstrumentLicenseStatus;
  readonly translationStatus: InstrumentTranslationStatus;
  readonly expectedItemCount: number;
  readonly breakpointSetVersion: number;
  readonly contentDigest: string;
  readonly items: readonly InstrumentItemStructure[];
  readonly sections: readonly InstrumentSectionStructure[];
  readonly breakpoints: readonly InstrumentBreakpointStructure[];
}
