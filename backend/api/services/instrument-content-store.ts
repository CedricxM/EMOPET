import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  asItemKey,
  asSectionKey,
  asSubscaleKey,
  buildVersionRef,
  type BreakpointAuthority,
  type BreakpointKind,
  type InstrumentBreakpointStructure,
  type InstrumentItemStructure,
  type InstrumentLicenseStatus,
  type InstrumentSectionStructure,
  type InstrumentTranslationStatus,
  type InstrumentVersionStructure,
  type ItemKey,
  type SealedItemPayload,
  type SealedTitlePayload,
  type SectionKey,
  type VersionRef,
} from '@emopet/shared';

/**
 * Access to licensed instrument content, under the approved storage split.
 *
 * Structure (ordering, scale bounds, section ranges, cut points, digests) is safe
 * to hold in PostgreSQL and is returned by `readVersionStructure`. The wording
 * lives only in a private content store and is returned, sealed, by `readItem`
 * and `readSectionTitle` for direct rendering.
 *
 * Two implementations exist on purpose:
 *
 * - `DemoContentStore` reads a fictional bundle committed to the repository. Its
 *   items ask about household objects, every rendered string is prefixed
 *   `DEMO — `, and nothing it returns is an instrument.
 * - `SecretStoreContentStore` is the shape of the real thing and deliberately has
 *   no body. It exists so the place where licensed content will attach is already
 *   cut, empty, and waiting for a contract.
 *
 * No licence is held today, so the real implementation must stay unimplemented.
 * Filling it in before written licence evidence exists would be the one change
 * this file is designed to prevent.
 */

export class NotLicensedError extends Error {
  readonly code = 'INSTRUMENT_CONTENT_NOT_LICENSED';

  constructor(message: string) {
    super(message);
    this.name = 'NotLicensedError';
  }
}

export class InstrumentContentError extends Error {
  readonly code = 'INSTRUMENT_CONTENT_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'InstrumentContentError';
  }
}

/**
 * Raised when a digest recomputed before presentation does not match the digest
 * recorded at ingestion. The caller must refuse the presentation and invalidate
 * the administration rather than showing content that may have been altered.
 */
export class RenderDigestMismatchError extends Error {
  readonly code = 'INSTRUMENT_RENDER_DIGEST_MISMATCH';

  constructor(
    readonly versionRef: VersionRef,
    readonly key: string,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`Render digest mismatch for ${key} in ${versionRef}`);
    this.name = 'RenderDigestMismatchError';
  }
}

export interface InstrumentContentStore {
  /** Structure and digests. Safe to persist. Contains no wording. */
  readVersionStructure(versionRef: VersionRef): Promise<InstrumentVersionStructure>;
  /** Licensed item wording, sealed for direct rendering. Channel B only. */
  readItem(versionRef: VersionRef, itemKey: ItemKey): Promise<SealedItemPayload>;
  /** Licensed official section title, sealed for direct rendering. */
  readSectionTitle(versionRef: VersionRef, sectionKey: SectionKey): Promise<SealedTitlePayload>;
  /** Digest of the whole ingested bundle. Proves which revision was served. */
  bundleDigest(versionRef: VersionRef): Promise<string>;
}

// ── Digests ─────────────────────────────────────────────────────────

/**
 * Unit separator between digest fields.
 *
 * Joining with a character that cannot occur in the wording keeps the digest
 * unambiguous: without it, moving a character between two adjacent fields would
 * leave the digest unchanged.
 */
const FIELD_SEPARATOR = '\u001F';

function sha256Hex(parts: readonly string[]): string {
  return createHash('sha256').update(parts.join(FIELD_SEPARATOR), 'utf8').digest('hex');
}

/**
 * Digest standing in for an item's wording.
 *
 * Computed against the stable `versionRef` rather than a database row id, so it
 * can be computed at ingestion, recomputed before every presentation, and
 * compared across environments without depending on which rows exist.
 */
export function computeRenderDigest(
  versionRef: VersionRef,
  itemKey: string,
  text: string,
  scaleLabels: readonly string[],
): string {
  return sha256Hex([versionRef, itemKey, text, ...scaleLabels]);
}

export function computeTitleRenderDigest(
  versionRef: VersionRef,
  sectionKey: string,
  title: string,
): string {
  return sha256Hex([versionRef, sectionKey, title]);
}

// ── Bundle shape as read from the private store ─────────────────────

interface RawScale {
  readonly scaleType: string;
  readonly scaleMin: number;
  readonly scaleMax: number;
  readonly labels: readonly string[];
}

interface RawItem {
  readonly itemKey: string;
  readonly canonicalPosition: number;
  readonly subscaleKey: string | null;
  readonly scaleRef: string;
  readonly reverseScored: boolean;
  readonly allowsNotApplicable: boolean;
  readonly text: string;
}

interface RawSection {
  readonly sectionKey: string;
  readonly ordinal: number;
  readonly firstPosition: number;
  readonly lastPosition: number;
  readonly title: string;
}

interface RawBreakpoint {
  readonly afterPosition: number;
  readonly breakpointKind: string;
  readonly authority: string;
}

export interface RawContentBundle {
  readonly schemaVersion: string;
  readonly instrumentCode: string;
  readonly version: string;
  readonly locale: string;
  readonly licenseStatus: string;
  readonly translationStatus: string;
  readonly breakpointSetVersion: number;
  readonly scales: Record<string, RawScale>;
  readonly sections: readonly RawSection[];
  readonly items: readonly RawItem[];
  readonly breakpoints: readonly RawBreakpoint[];
}

const BUNDLE_SCHEMA_VERSION = 'emopet-instrument-content-bundle-v1';

const LICENSE_STATUSES: readonly InstrumentLicenseStatus[] = [
  'not_proven',
  'granted',
  'expired',
  'revoked',
  'demo_only',
];

const TRANSLATION_STATUSES: readonly InstrumentTranslationStatus[] = [
  'unreviewed',
  'official',
  'back_translated',
  'not_equivalent',
];

const BREAKPOINT_KINDS: readonly BreakpointKind[] = ['section_boundary', 'intra_section'];

const BREAKPOINT_AUTHORITIES: readonly BreakpointAuthority[] = [
  'licensed',
  'emopet_proposed',
  'emopet_approved',
];

function fail(message: string): never {
  throw new InstrumentContentError(message);
}

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validate a bundle and derive its structure.
 *
 * Exported so that malformed bundles can be exercised directly in tests without
 * committing a broken fixture. Every rule here is fail-closed: a bundle that
 * cannot be validated is refused rather than partially loaded, because a
 * partially loaded instrument is an altered instrument.
 */
export function validateBundle(raw: RawContentBundle): InstrumentVersionStructure {
  if (raw.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
    fail(`Unsupported bundle schemaVersion: ${raw.schemaVersion}`);
  }

  const licenseStatus = raw.licenseStatus as InstrumentLicenseStatus;
  if (!LICENSE_STATUSES.includes(licenseStatus)) {
    fail(`Unknown licenseStatus: ${raw.licenseStatus}`);
  }

  const translationStatus = raw.translationStatus as InstrumentTranslationStatus;
  if (!TRANSLATION_STATUSES.includes(translationStatus)) {
    fail(`Unknown translationStatus: ${raw.translationStatus}`);
  }

  const versionRef = buildVersionRef(raw.instrumentCode, raw.version, raw.locale);

  if (raw.items.length === 0) fail('Bundle declares no items');
  if (!Number.isInteger(raw.breakpointSetVersion) || raw.breakpointSetVersion < 1) {
    fail(`Invalid breakpointSetVersion: ${raw.breakpointSetVersion}`);
  }

  // Canonical positions must be exactly 1..N with no gap and no duplicate.
  // A gap would silently shorten the instrument; a duplicate would make the
  // administration order ambiguous.
  const positions = raw.items.map((item) => item.canonicalPosition).sort((a, b) => a - b);
  for (let index = 0; index < positions.length; index += 1) {
    if (positions[index] !== index + 1) {
      fail(
        `Canonical positions must be contiguous from 1; expected ${index + 1}, found ${String(positions[index])}`,
      );
    }
  }

  const itemKeys = new Set<string>();
  const items: InstrumentItemStructure[] = [];

  for (const item of raw.items) {
    if (itemKeys.has(item.itemKey)) fail(`Duplicate itemKey: ${item.itemKey}`);
    itemKeys.add(item.itemKey);

    const scale = raw.scales[item.scaleRef];
    if (!scale) fail(`Item ${item.itemKey} references unknown scaleRef ${item.scaleRef}`);
    if (scale.scaleMin >= scale.scaleMax) {
      fail(`Scale ${item.scaleRef} has scaleMin >= scaleMax`);
    }
    // One label per point on the scale: a missing label would be rendered as a
    // blank option, which is an altered item rather than a cosmetic defect.
    const expectedLabels = scale.scaleMax - scale.scaleMin + 1;
    if (scale.labels.length !== expectedLabels) {
      fail(
        `Scale ${item.scaleRef} declares ${scale.labels.length} labels for ${expectedLabels} points`,
      );
    }
    if (item.text.trim().length === 0) fail(`Item ${item.itemKey} has empty text`);

    items.push({
      itemKey: asItemKey(item.itemKey),
      subscaleKey: item.subscaleKey === null ? null : asSubscaleKey(item.subscaleKey),
      canonicalPosition: item.canonicalPosition,
      scaleType: scale.scaleType,
      scaleMin: scale.scaleMin,
      scaleMax: scale.scaleMax,
      allowsNotApplicable: item.allowsNotApplicable,
      reverseScored: item.reverseScored,
      renderDigest: computeRenderDigest(versionRef, item.itemKey, item.text, scale.labels),
    });
  }

  items.sort((a, b) => a.canonicalPosition - b.canonicalPosition);

  // Sections must tile 1..N exactly: no gap, no overlap, ordinals contiguous.
  const orderedSections = [...raw.sections].sort((a, b) => a.ordinal - b.ordinal);
  const sections: InstrumentSectionStructure[] = [];
  let expectedFirst = 1;

  for (const [index, section] of orderedSections.entries()) {
    if (section.ordinal !== index) {
      fail(`Section ordinals must be contiguous from 0; found ${section.ordinal} at index ${index}`);
    }
    if (section.firstPosition !== expectedFirst) {
      fail(
        `Section ${section.sectionKey} must start at ${expectedFirst}, found ${section.firstPosition}`,
      );
    }
    if (section.lastPosition < section.firstPosition) {
      fail(`Section ${section.sectionKey} ends before it starts`);
    }
    if (section.title.trim().length === 0) fail(`Section ${section.sectionKey} has empty title`);

    sections.push({
      sectionKey: asSectionKey(section.sectionKey),
      ordinal: section.ordinal,
      firstPosition: section.firstPosition,
      lastPosition: section.lastPosition,
      titleRenderDigest: computeTitleRenderDigest(versionRef, section.sectionKey, section.title),
    });
    expectedFirst = section.lastPosition + 1;
  }

  if (sections.length > 0 && expectedFirst !== items.length + 1) {
    fail(`Sections cover positions 1..${expectedFirst - 1} but the bundle has ${items.length} items`);
  }

  // Cut points. A cut after the last item is meaningless, and a cut claiming to
  // be a section boundary where no section ends is the "misplaced breakpoint"
  // case: it would let the engine split a section while reporting that it had
  // not, which is exactly what the whitelist exists to prevent.
  const sectionEnds = new Set(sections.map((section) => section.lastPosition));
  const seenBreakpoints = new Set<number>();
  const breakpoints: InstrumentBreakpointStructure[] = [];

  for (const breakpoint of raw.breakpoints) {
    const kind = breakpoint.breakpointKind as BreakpointKind;
    if (!BREAKPOINT_KINDS.includes(kind)) {
      fail(`Unknown breakpointKind: ${breakpoint.breakpointKind}`);
    }
    const authority = breakpoint.authority as BreakpointAuthority;
    if (!BREAKPOINT_AUTHORITIES.includes(authority)) {
      fail(`Unknown breakpoint authority: ${breakpoint.authority}`);
    }
    if (!Number.isInteger(breakpoint.afterPosition)) {
      fail(`Breakpoint afterPosition must be an integer: ${String(breakpoint.afterPosition)}`);
    }
    if (breakpoint.afterPosition < 1 || breakpoint.afterPosition >= items.length) {
      fail(
        `Breakpoint afterPosition ${breakpoint.afterPosition} is outside 1..${items.length - 1}`,
      );
    }
    if (seenBreakpoints.has(breakpoint.afterPosition)) {
      fail(`Duplicate breakpoint at afterPosition ${breakpoint.afterPosition}`);
    }
    seenBreakpoints.add(breakpoint.afterPosition);

    if (kind === 'section_boundary' && !sectionEnds.has(breakpoint.afterPosition)) {
      fail(
        `Breakpoint after ${breakpoint.afterPosition} is declared section_boundary but no section ends there`,
      );
    }
    if (kind === 'intra_section' && sectionEnds.has(breakpoint.afterPosition)) {
      fail(
        `Breakpoint after ${breakpoint.afterPosition} is declared intra_section but a section ends there`,
      );
    }

    breakpoints.push({ afterPosition: breakpoint.afterPosition, breakpointKind: kind, authority });
  }

  breakpoints.sort((a, b) => a.afterPosition - b.afterPosition);

  return {
    versionRef,
    instrumentCode: raw.instrumentCode,
    version: raw.version,
    locale: raw.locale,
    licenseStatus,
    translationStatus,
    expectedItemCount: items.length,
    breakpointSetVersion: raw.breakpointSetVersion,
    contentDigest: computeBundleDigest(raw),
    items,
    sections,
    breakpoints,
  };
}

/**
 * Digest of the bundle's semantic content.
 *
 * Built from a canonical projection rather than the raw file bytes, so
 * reformatting the source does not invalidate it while any change to a key,
 * position, scale or wording does.
 */
export function computeBundleDigest(raw: RawContentBundle): string {
  const canonical = [
    raw.schemaVersion,
    raw.instrumentCode,
    raw.version,
    raw.locale,
    String(raw.breakpointSetVersion),
    ...[...raw.sections]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((s) => [s.sectionKey, s.ordinal, s.firstPosition, s.lastPosition, s.title].join('|')),
    ...[...raw.items]
      .sort((a, b) => a.canonicalPosition - b.canonicalPosition)
      .map((i) =>
        [
          i.itemKey,
          i.canonicalPosition,
          i.subscaleKey ?? '',
          i.scaleRef,
          String(i.reverseScored),
          String(i.allowsNotApplicable),
          i.text,
        ].join('|'),
      ),
    ...Object.keys(raw.scales)
      .sort()
      .map((key) => {
        const scale = raw.scales[key];
        if (!scale) return key;
        return [key, scale.scaleType, scale.scaleMin, scale.scaleMax, ...scale.labels].join('|');
      }),
    ...[...raw.breakpoints]
      .sort((a, b) => a.afterPosition - b.afterPosition)
      .map((b) => [b.afterPosition, b.breakpointKind, b.authority].join('|')),
  ];

  return sha256Hex(canonical);
}

// ── Demo implementation ─────────────────────────────────────────────

function contentDirectory(): string {
  const override = process.env['INSTRUMENT_CONTENT_DIR']?.trim();
  if (override) return override;
  // Resolved from the working directory rather than from import.meta.url, so the
  // path is identical whether the service runs from source under tsx or from the
  // compiled output under dist.
  return resolve(process.cwd(), '..', 'config', 'instruments');
}

/**
 * Reads the fictional bundle committed to the repository.
 *
 * This implementation is for development, tests and the demonstration only. Its
 * content is not an instrument: every rendered string is prefixed `DEMO — ` and
 * the items ask about household objects.
 */
export class DemoContentStore implements InstrumentContentStore {
  private readonly cache = new Map<string, InstrumentVersionStructure>();
  private readonly raw = new Map<string, RawContentBundle>();

  constructor(private readonly fileName = 'demo-instrument-v0.json') {}

  private async load(versionRef: VersionRef): Promise<{
    structure: InstrumentVersionStructure;
    raw: RawContentBundle;
  }> {
    const cachedStructure = this.cache.get(versionRef);
    const cachedRaw = this.raw.get(versionRef);
    if (cachedStructure && cachedRaw) return { structure: cachedStructure, raw: cachedRaw };

    const path = resolve(contentDirectory(), this.fileName);
    const parsed = JSON.parse(await readFile(path, 'utf8')) as RawContentBundle;
    const structure = validateBundle(parsed);

    if (structure.versionRef !== versionRef) {
      fail(`Bundle ${this.fileName} provides ${structure.versionRef}, not ${versionRef}`);
    }
    if (structure.licenseStatus !== 'demo_only') {
      // A bundle in the repository that claims any other licence status would mean
      // licensed content had been committed. Refuse rather than serve it.
      fail(
        `Repository bundle ${this.fileName} must declare licenseStatus 'demo_only', found '${structure.licenseStatus}'`,
      );
    }

    this.cache.set(versionRef, structure);
    this.raw.set(versionRef, parsed);
    return { structure, raw: parsed };
  }

  async readVersionStructure(versionRef: VersionRef): Promise<InstrumentVersionStructure> {
    const { structure } = await this.load(versionRef);
    return structure;
  }

  async readItem(versionRef: VersionRef, itemKey: ItemKey): Promise<SealedItemPayload> {
    const { structure, raw } = await this.load(versionRef);

    const rawItem = raw.items.find((item) => item.itemKey === itemKey);
    const itemStructure = structure.items.find((item) => item.itemKey === itemKey);
    if (!rawItem || !itemStructure) {
      fail(`Unknown itemKey ${itemKey} in ${versionRef}`);
    }

    const scale = raw.scales[rawItem.scaleRef];
    if (!scale) fail(`Item ${itemKey} references unknown scaleRef ${rawItem.scaleRef}`);

    // Recomputed here, immediately before the payload leaves the store, and
    // compared with the digest recorded at ingestion. This is the check that
    // turns "we render the licensed item" into something provable.
    const renderDigest = computeRenderDigest(versionRef, itemKey, rawItem.text, scale.labels);
    if (renderDigest !== itemStructure.renderDigest) {
      throw new RenderDigestMismatchError(
        versionRef,
        itemKey,
        itemStructure.renderDigest,
        renderDigest,
      );
    }

    return {
      itemKey: itemStructure.itemKey,
      subscaleKey: itemStructure.subscaleKey,
      canonicalPosition: itemStructure.canonicalPosition,
      text: rawItem.text,
      scaleLabels: [...scale.labels],
      scaleType: itemStructure.scaleType,
      scaleMin: itemStructure.scaleMin,
      scaleMax: itemStructure.scaleMax,
      allowsNotApplicable: itemStructure.allowsNotApplicable,
      reverseScored: itemStructure.reverseScored,
      renderDigest,
    };
  }

  async readSectionTitle(
    versionRef: VersionRef,
    sectionKey: SectionKey,
  ): Promise<SealedTitlePayload> {
    const { structure, raw } = await this.load(versionRef);

    const rawSection = raw.sections.find((section) => section.sectionKey === sectionKey);
    const sectionStructure = structure.sections.find((section) => section.sectionKey === sectionKey);
    if (!rawSection || !sectionStructure) {
      fail(`Unknown sectionKey ${sectionKey} in ${versionRef}`);
    }

    const titleRenderDigest = computeTitleRenderDigest(versionRef, sectionKey, rawSection.title);
    if (titleRenderDigest !== sectionStructure.titleRenderDigest) {
      throw new RenderDigestMismatchError(
        versionRef,
        sectionKey,
        sectionStructure.titleRenderDigest,
        titleRenderDigest,
      );
    }

    return {
      sectionKey: sectionStructure.sectionKey,
      ordinal: sectionStructure.ordinal,
      firstPosition: sectionStructure.firstPosition,
      lastPosition: sectionStructure.lastPosition,
      title: rawSection.title,
      titleRenderDigest,
    };
  }

  async bundleDigest(versionRef: VersionRef): Promise<string> {
    const { structure } = await this.load(versionRef);
    return structure.contentDigest;
  }
}

// ── Real implementation: shape only ─────────────────────────────────

/**
 * Licensed content read from a private secret store.
 *
 * Intentionally unimplemented. The signature exists so the attachment point for
 * licensed content is already cut and visibly empty; the body stays absent until
 * a licence exists in writing, because implementing it is the single change that
 * would put licensed wording into this system without authority to hold it.
 */
export class SecretStoreContentStore implements InstrumentContentStore {
  constructor(private readonly contentStoreRef: string) {}

  private refuse(): never {
    throw new NotLicensedError(
      `No licence is held for instrument content at ${this.contentStoreRef}. ` +
        'SecretStoreContentStore is deliberately unimplemented until written licence evidence exists.',
    );
  }

  // These are `async` deliberately. A store method whose signature promises a
  // Promise must reject rather than throw synchronously, or every caller needs
  // both a try/catch and a .catch to be safe.
  async readVersionStructure(_versionRef: VersionRef): Promise<InstrumentVersionStructure> {
    this.refuse();
  }

  async readItem(_versionRef: VersionRef, _itemKey: ItemKey): Promise<SealedItemPayload> {
    this.refuse();
  }

  async readSectionTitle(
    _versionRef: VersionRef,
    _sectionKey: SectionKey,
  ): Promise<SealedTitlePayload> {
    this.refuse();
  }

  async bundleDigest(_versionRef: VersionRef): Promise<string> {
    this.refuse();
  }
}

/**
 * Pick an implementation from the version's licence status.
 *
 * Fail-closed: only `demo_only` gets a working store. `granted` routes to the
 * unimplemented real store, so a licence that is recorded but not yet wired up
 * fails loudly instead of silently serving demo content as if it were the
 * instrument. Everything else refuses outright.
 */
export function createInstrumentContentStore(
  licenseStatus: InstrumentLicenseStatus,
  contentStoreRef: string,
): InstrumentContentStore {
  switch (licenseStatus) {
    case 'demo_only':
      return new DemoContentStore();
    case 'granted':
      return new SecretStoreContentStore(contentStoreRef);
    case 'not_proven':
    case 'expired':
    case 'revoked':
      throw new NotLicensedError(
        `Instrument content cannot be served with licenseStatus '${licenseStatus}'.`,
      );
  }
}
