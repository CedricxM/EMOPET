# EMOPET — Current Repository Authority-Conflict Audit — 17 September 2026

**Audit date:** 2026-09-17
**Status:** `CONTROLLED MEMORY / IMPLEMENTATION RECONCILIATION REQUIRED`
**Scope:** conflicts between in-repository documents that claim authority and the controlled authorities that actually govern. Plus one runtime defect discovered while verifying a brand claim.
**Base audited:** `main` @ `51bfdde694903c7f0e4b759ae8914c1d18f15810` (2026-09-07)

## Purpose

`docs/records/memory/BRAND_AND_PUBLIC_COPY_LINEAGE_MAY_AUG_2026.md` §4 already records repository brand drift for `AGENTS.md` / `CLAUDE.md` (§4.1) and `apps/web/styles/tokens.css` (§4.2).

This record closes two gaps that audit did not cover, and adds one architectural finding in the same class — a document or a code path that *claims* an authority it does not hold.

It redefines nothing. It records conflicts so that a contributor reading the nearest file does not apply a superseded instruction in good faith.

---

## 1. `apps/web/BRAND_AUTHORITY.md` — a second, inverted brand authority

**Status:** `HISTORICAL / SUPERSEDED — header applied 2026-09-17`

This file was cited in **no** memory record before today. It is the most consequential of the brand-drift surfaces because, unlike `tokens.css`, it does not merely *implement* a superseded system — it **instructs contributors to destroy the current one**.

### 1.1 Competing authority claim

Its original header read, verbatim:

> *"Single source of truth for the EMOPET visual identity across web and mobile. Last updated: 2026-08-08."*

`BRAND-AUTHORITY-001` (`docs/brand/…_2026-08-25.md`) is dated **17 days later**, carries `Status: CONTROLLED BRAND AUTHORITY`, and names the Founder as decision authority. The August 8 file has no control status and no owner.

### 1.2 The deprecation table is inverted

Its section *"Legacy Colors (DEPRECATED — DO NOT USE)"* lists four hex values that *"must never appear in new code"*:

| Hex it forbids | What BRAND-AUTHORITY-001 §3.2 calls it |
|---|---|
| `#C97B5A` | **Terre cuite** — prescribed |
| `#6B8E6F` | **Lichen** — prescribed |
| `#1F2A36` | **Granit** — prescribed |
| `#4F6E54` | near-miss on Lichen sombre `#4F6F53` |

Its **Rule 1** turns this into an action: *"If you see `#C97B5A`, `#6B8E6F`, `#1F2A36`, or `#4F6E54` anywhere in the codebase, **replace immediately**."*

Executing Rule 1 as written would delete three of the current authority's twelve palette values from the codebase, and would be defensible by citing a file that calls itself the single source of truth.

### 1.3 The typography table matches neither authority nor code

| | Display | Body | Technical |
|---|---|---|---|
| `apps/web/BRAND_AUTHORITY.md` | Fraunces | Source Sans 3 | *(absent)* |
| **BRAND-AUTHORITY-001 §3.1** | Fraunces | **Instrument Sans** | **JetBrains Mono** |
| **Shipped** (`tokens.css`) | Sora | Sora | JetBrains Mono |

### 1.4 Action taken

Per `INDEX.md` *Current-over-history rule*: the historical record and its date are **preserved**, the superseding authority is **identified**, and the two are **not blended**. A `HISTORICAL / SUPERSEDED — NOT BRAND AUTHORITY` header was added, and the inverted deprecation table and Rule 1 were marked `SUPERSEDED — do not execute`.

**No token, component or rendered pixel was changed by that supersession.**

---

## 2. `--font-fraunces` / `--font-source-sans` were consumed but never defined

**Class:** runtime defect, not drift. **Status:** repaired 2026-09-17.

Discovered while verifying §1.3.

### 2.1 Observed

- The two variables are consumed at **87 call sites**: `apps/web/app/page.tsx` and every `apps/web/components/landing/*.tsx`, as inline `style={{ fontFamily: 'var(--font-fraunces)' }}`.
- They were **defined nowhere** in the repository: no CSS declaration, no `@font-face`, and **zero `next/font` imports anywhere in `apps/web`**.
- `apps/web/app/layout.tsx:7` asserts *"Font stacks are defined in tokens.css"*. `tokens.css` defined `--emopet-font-sora`, `--emopet-font-jetbrains`, `--font-serif`, `--font-sans`, `--font-mono` — not those two.

### 2.2 Effect

An unresolvable `var()` with no fallback makes the declaration invalid; the browser drops it and the element inherits. `globals.css:19-24` sets `html, body { font-family: var(--font-sans) }` → Sora.

**So the entire public landing page already rendered in Sora, and all 87 explicit font declarations were inert.** `apps/web/SMOKE.md:28` carries a regression check for precisely this failure mode.

### 2.3 Action taken

The two variables are now defined in `tokens.css`, pointing at the families actually shipped, and renamed **by role** rather than by font family:

```css
--font-display: var(--font-serif);
--font-body:    var(--font-sans);
```

All **87** call sites across `app/page.tsx` and the seven `components/landing/*.tsx` were updated in the same change. Counts verified before and after: 87 old references, 0 remaining, 87 new.

**This is a provable visual no-op** — those declarations already resolved to Sora by inheritance, and the new names resolve to the same stacks. The effect is that they become valid and steerable from one place.

Renaming was deliberate: a font family embedded in a variable name (`--font-fraunces` pointing at Sora) is false the moment the shipped family differs from the intended one, which is exactly the state this repository was in. Role names survive a migration; family names do not.

### 2.4 Explicit non-action

The repair deliberately does **not** load Fraunces, Source Sans or Instrument Sans. Doing so would be an unreviewed visual migration. Applying the controlled typography (Fraunces display / Instrument Sans body / JetBrains Mono technical) requires pilot + QA and is not closed by this record.

What the repair does leave behind is a **single switch point**: when that migration is decided, `--font-display` and `--font-body` are the two lines to change, instead of 87 inline declarations.

---

## 3. `@emopet/eli-engine` is not wired into any runtime surface

**Status:** `RECORDED ONLY — owned by open gate #118 (ELI-ARCH-01)`. No change made.

`packages/eli-engine` contains the canonical engine: EKF (`state-transition`, `observation-model`, `update`), `vetoes`, `confidence`, `baseline`, `rsm`, plus six test files.

Its only non-manifest mention in application code is a **comment**. `apps/web/lib/eli/catalog.ts` states:

> *"Valeurs alignées sur le moteur canonique (`@emopet/eli-engine`) mais **définies localement pour éviter tout import cross-package dans le build Next**."*

What the dashboard actually consumes is a synthetic generator — `apps/web/app/dashboard/BienEtreSection.tsx:20` imports `freezeBaseline, generateSnapshots, proxyHistory, summarize` from `lib/eli/mock`.

`CURRENT_UI_ELI_PRODUCT_DRIFT_AUDIT_2026-09-07.md` records the *score semantics* problem (`MOCK_ELI.value = 72`). It does not record the *architectural* one: **no runtime module imports the canonical engine**, so there are two divergent ELI implementations and the user-facing one is not the scientific one.

Maturity, stated plainly: the engine is **implemented and unit-tested**; it is **not wired**; nothing observed here is bench or animal validation.

This is not closable by an agent — it is the substance of gate #118 and belongs to a reviewed integration slice.

---

## 4. What this record does not do

- It does not migrate the web palette or typography to BRAND-AUTHORITY-001. That needs pilot + QA.
- It does not promote, demote or close any gate.
- It does not modify `tokens.css` colour values, any component, or any rendered output.
- It does not alter `BRAND_AND_PUBLIC_COPY_LINEAGE_MAY_AUG_2026.md`, which stays controlled and unedited; this record complements it.
- It establishes no scientific, product or regulatory claim.

## 5. Open, requiring human decision

1. **Web brand migration** — whether and when `apps/web` moves from Sora + navy/orange/teal to the controlled Fraunces / Instrument Sans + sable/granit/terre-cuite/lichen system. Already listed as step 3 of §4's follow-up in the May–August brand record.
2. **Fate of `apps/web/BRAND_AUTHORITY.md`** — retain as a marked historical record (current state) or retire it once the migration lands.
3. **Gate #118** — canonical ELI runtime authority and the duplicate-implementation boundary.
