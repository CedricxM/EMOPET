# EMOPET — Brand and Public-Copy Lineage — May–August 2026

**Audit date:** 2026-09-07  
**Status:** `CONTROLLED MEMORY / BRAND IMPLEMENTATION RECONCILIATION REQUIRED`  
**Scope:** historical brand lineage + present repository drift. Current controlled brand authority remains controlling.

## Purpose

Preserve the actual sequence of EMOPET visual systems and identify where the current repository still implements a superseded system.

This record does **not** redefine the brand. It records lineage and implementation drift so historical assets are not mistaken for current authority.

## 1. Historical system recovered — 28 May 2026

The ClickUp Brandbook created on 28 May 2026 records an early EMOPET identity with:

- Deep Navy `#1D1A6A`;
- Warm Orange `#FE502D`;
- Teal Accent `#2CB7AB`;
- Soft Cream `#F6EFE7`;
- Warm Gray `#6B6F76`;
- Playfair Display Bold for the `emopet` wordmark;
- Montserrat Semi Bold for the slogan;
- slogan: `SMART CARE. STRONG BOND.`

Related ClickUp task `869deeejp` preserves the same colour system.

### Status

`HISTORICAL / LEGACY BRAND MATERIAL`

This is not current visual authority.

## 2. Intermediate rebrand recorded in repository instructions — 30 May 2026

Current `AGENTS.md` and `CLAUDE.md` contain a later note stating that a 30 May 2026 rebrand replaced an earlier visual profile. That intermediate system specifies:

- lowercase `emopet`;
- navy/orange/teal/cream/gray palette inherited from the May brandbook;
- Sora as the primary display/body family;
- JetBrains Mono for technical/data text;
- a paw + orange spiral mark;
- taglines including `Soins intelligents. Lien fort.` and `Un cœur breton. Une care intelligente.`

This establishes that the May visual system evolved quickly and that the repository later encoded the Sora/paw-spiral variant as operational guidance.

### Status today

`HISTORICAL / INTERMEDIATE IMPLEMENTATION PROFILE — SUPERSEDED`

The fact that `AGENTS.md` / `CLAUDE.md` call it current is itself repository drift, not evidence that it outranks the later controlled authority.

## 3. Current controlled authority — 25 August 2026

Current brand authority is explicitly controlled in:

`docs/brand/BRAND-AUTHORITY-001_EMOPET_Current_Visual_Authority_2026-08-25.md`

It states that `EMOPET_Charte_Graphique_v2.html — Charte graphique v2.0` is the active visual authority.

Controlled visual system:

- **Display / titles / wordmark:** Fraunces;
- **Body:** Instrument Sans;
- **Technical / data / metadata:** JetBrains Mono;
- **Primary mark:** aperture mark + EMOPET wordmark;
- **Primary identity:** species-agnostic;
- **Palette:** sable / granit / ardoise / pierre / terre cuite / lichen;
- reliability-state colours remain semantically constrained.

The authority explicitly classifies the Playfair/Montserrat/indigo-coral-teal profile as historical legacy and prohibits silent hybridisation.

### Current rule

`BRAND-AUTHORITY-001` wins over older ClickUp Brandbooks, historical code comments, legacy design tokens and assistant instruction files.

## 4. Present repository drift

The repository implementation has not fully caught up with the August authority.

### 4.1 `AGENTS.md` and `CLAUDE.md`

Both files currently reverse the authority order:

- they call the May 30 Sora/navy/orange/teal profile the current rebrand;
- they describe the Fraunces-based v2 profile as historical;
- they still describe a paw/spiral mark as active.

This conflicts directly with `BRAND-AUTHORITY-001`, which makes Fraunces / Instrument Sans / aperture current and the earlier systems legacy.

**Status:** `STALE CONTROL INSTRUCTION / RECONCILIATION REQUIRED`.

### 4.2 `apps/web/styles/tokens.css`

Current implementation still declares:

- `#1D1A6A` navy;
- `#FE502D` orange;
- `#2CB7AB` teal;
- `#F6EFE7` cream;
- `#6B6F76` gray;
- Sora as both primary sans and serif stack.

These are the legacy/intermediate tokens, not the palette/type system controlled by the August authority.

**Status:** `IMPLEMENTATION DRIFT / NOT BRAND AUTHORITY`.

### 4.3 Public metadata and static copy

Current web code still exposes the historical slogan in several places:

- metadata title: `EMOPET - Smart care. Strong bond.`;
- French dictionary: `Soins intelligents. Lien fort.`;
- English dictionary: `Smart care. Strong bond.`;
- logo alt text repeats the slogan.

The August visual authority does not, by itself, establish a replacement tagline. Therefore the correct status is not to invent one.

**Status:** `LEGACY COPY PRESENT / TAGLINE AUTHORITY TO_CONFIRM`.

A future brand/content decision should explicitly either retain, replace or retire the slogan.

## 5. No silent code migration

This audit does not authorise a bulk visual rewrite.

`BRAND-AUTHORITY-001` itself requires a pilot conversion and QA gate before corpus-wide conversion, including content preservation, no clipping, correct metadata, typography/palette compliance and page-by-page PDF review for controlled documents.

For application code, migration should likewise be deliberate and tested rather than a blind token swap.

## 6. Recommended reconciliation order

1. Correct `AGENTS.md` and `CLAUDE.md` authority language so assistants stop receiving inverted brand instructions.
2. Decide the current tagline explicitly: retain / replace / retire.
3. Produce a web token migration plan from Sora + navy/orange/teal/cream to current Fraunces / Instrument Sans + sable/granit/terre-cuite/lichen.
4. Audit actual logo assets under `apps/web/public/assets/brand` against the aperture/wordmark authority before replacing references.
5. Migrate a bounded pilot surface first.
6. Run visual, accessibility and regression QA before wider rollout.
7. Preserve legacy assets as historical, not as co-equal current styles.

## 7. Historical sequence

The best-supported brand sequence is:

`28 May Playfair/Montserrat + navy/orange/teal/cream + SMART CARE. STRONG BOND.`

→

`30 May Sora + paw/spiral + same legacy colour family + bilingual tagline variants`

→

`25 August controlled v2 authority: Fraunces + Instrument Sans + JetBrains Mono + aperture + sable/granit/terre-cuite/lichen`

The later controlled authority supersedes the earlier systems for current EMOPET-owned visual expression.

## 8. Closure status

The historical brand-lineage gap is now **substantially closed**.

What remains open is implementation reconciliation, not provenance:

- `OPEN-BRAND-IMPLEMENTATION-001` — reconcile assistant instruction files with current authority;
- `OPEN-BRAND-IMPLEMENTATION-002` — reconcile web design tokens/assets with current authority;
- `OPEN-BRAND-COPY-001` — establish explicit current tagline status.

**Historical presence ≠ current authority. Current code presence ≠ current brand decision.**
