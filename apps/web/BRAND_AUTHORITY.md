# EMOPET — Brand Authority Document

**Status:** `HISTORICAL / SUPERSEDED — NOT BRAND AUTHORITY`
**Original date:** 2026-08-08 (preserved)
**Superseded by:** `docs/brand/BRAND-AUTHORITY-001_EMOPET_Current_Visual_Authority_2026-08-25.md` (`CONTROLLED BRAND AUTHORITY`, 2026-08-25)
**Supersession recorded:** 2026-09-17 — `docs/records/memory/CURRENT_REPO_AUTHORITY_CONFLICT_AUDIT_2026-09-17.md`

> **This document is retained as an implementation record of the navy / orange / teal
> profile that `apps/web` currently ships. It is not the brand authority and must not be
> used to decide what the palette or typography should be.**
>
> Its original header read, verbatim: *"Single source of truth for the EMOPET visual
> identity across web and mobile. Last updated: 2026-08-08."* That wording is quoted here
> so it is not lost, and is no longer operative: a later controlled authority exists.
>
> **§ "Legacy Colors (DEPRECATED — DO NOT USE)" and Rule 1 below are inverted with
> respect to the current authority.** The four hex values they instruct contributors to
> delete on sight — `#C97B5A`, `#6B8E6F`, `#1F2A36`, `#4F6E54` — include terre cuite,
> lichen and granit, which BRAND-AUTHORITY-001 **prescribes**. Do not execute that
> instruction. See the audit record for the full evidence.
>
> Nothing in this file is changed other than this header. No token, component or rendered
> pixel is modified by this supersession. Per `docs/records/memory/INDEX.md`
> (*Current-over-history rule*): the historical record and its date are preserved, the
> superseding authority is identified, and the two are not blended.

---

## Official Palette

| Token               | Hex       | Role                         |
|---------------------|-----------|------------------------------|
| `--emopet-navy`     | `#1D1A6A` | Brand primary, headings, text |
| `--emopet-orange`   | `#FE502D` | Accent, CTA, interactive      |
| `--emopet-teal`     | `#2CB7AB` | Secondary, active states       |
| `--emopet-cream`    | `#F6EFE7` | Surfaces, backgrounds          |
| `--emopet-gray`     | `#6B6F76` | Muted text, captions           |

### Derived Scales

See `apps/web/styles/tokens.css` for the full token set:
- **Granit** (navy scale): 200–900
- **Terracotta** (orange scale): 100–700
- **Lichen** (teal scale): 100–700
- **Cream** (surface scale): 50–400

---

## Legacy Colors (DEPRECATED — DO NOT USE)

> ⚠ **SUPERSEDED — DO NOT ACT ON THIS SECTION.** Three of the four values below
> (`#C97B5A` terre cuite, `#6B8E6F` lichen, `#1F2A36` granit) are **prescribed** by the
> current controlled authority BRAND-AUTHORITY-001 (2026-08-25). This section predates it
> by 17 days. Retained as a historical record of the August 8 intent only.

The following hex values belonged to the pre-2026 palette and must never appear in new code:

| Deprecated Hex | Was Used For       | Replaced By         |
|---------------|--------------------|---------------------|
| `#C97B5A`    | Accent / dots       | `#FE502D` (orange)  |
| `#6B8E6F`    | Secondary / toggle  | `#2CB7AB` (teal)    |
| `#1F2A36`    | Dark text / surface | `#1D1A6A` (navy)    |
| `#4F6E54`    | Hover states        | `#1E9A90` (teal-700)|

---

## Typography

> ⚠ **SUPERSEDED, and it never matched the code either.** This table describes neither the
> current authority nor the shipped implementation:
> - **Current authority** (BRAND-AUTHORITY-001): Fraunces (display) / **Instrument Sans**
>   (body) / **JetBrains Mono** (technical, data, metadata).
> - **Shipped in `apps/web`**: `--emopet-font-sora` and `--emopet-font-jetbrains`
>   (`styles/tokens.css:123-124`). Neither `--font-fraunces` nor `--font-source-sans`
>   exists in the codebase.
>
> Retained as a historical record of the August 8 intent only.

| Family            | CSS Variable           | Usage                    |
|-------------------|------------------------|--------------------------|
| Fraunces          | `--font-fraunces`      | Headlines, emotional text |
| Source Sans 3     | `--font-source-sans`   | Body, UI labels           |

---

## Rules

1. ~~**No hardcoded legacy hex** — If you see `#C97B5A`, `#6B8E6F`, `#1F2A36`, or `#4F6E54` anywhere in the codebase, replace immediately with the corresponding brand token.~~
   **SUPERSEDED — do not execute.** These values are prescribed by BRAND-AUTHORITY-001.
   Deleting them on sight would remove the current authority's palette from the codebase.
2. **Tokens first** — Prefer CSS custom properties (`var(--emopet-navy)`) over raw hex when possible.
3. **Narrative integrity** — Text content, scene order, and interactions must never be altered during a chromatic update.
4. **Mobile parity** — Any palette change here must be mirrored in the mobile theme file.

---

## File Map

| File                                              | Purpose                      |
|---------------------------------------------------|------------------------------|
| `apps/web/styles/tokens.css`                      | Design token definitions      |
| `apps/web/app/page.tsx`                           | Homepage composition          |
| `apps/web/components/landing/LandingNav.tsx`      | Navigation bar                |
| `apps/web/components/landing/LandingFooter.tsx`   | Footer                        |
| `apps/web/components/landing/TimelineScene.tsx`   | Night timeline animation      |
| `apps/web/components/landing/EcosystemScene.tsx`  | Ecosystem showcase            |
| `apps/web/components/landing/AppMockup.tsx`       | Phone mockup UI               |
| `apps/web/components/landing/BreizConversation.tsx`| AI conversation demo         |
| `apps/web/components/landing/PrivacyControls.tsx` | Privacy toggles               |
| `apps/web/components/landing/SceneWrapper.tsx`    | Section animation wrapper     |

---

*Maintained by the EMOPET design team. For questions, open an issue on the repository.*
