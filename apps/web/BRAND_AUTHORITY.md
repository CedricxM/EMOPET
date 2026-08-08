# EMOPET — Brand Authority Document

> Single source of truth for the EMOPET visual identity across web and mobile.
> Last updated: 2026-08-08

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

The following hex values belonged to the pre-2026 palette and must never appear in new code:

| Deprecated Hex | Was Used For       | Replaced By         |
|---------------|--------------------|---------------------|
| `#C97B5A`    | Accent / dots       | `#FE502D` (orange)  |
| `#6B8E6F`    | Secondary / toggle  | `#2CB7AB` (teal)    |
| `#1F2A36`    | Dark text / surface | `#1D1A6A` (navy)    |
| `#4F6E54`    | Hover states        | `#1E9A90` (teal-700)|

---

## Typography

| Family            | CSS Variable           | Usage                    |
|-------------------|------------------------|--------------------------|
| Fraunces          | `--font-fraunces`      | Headlines, emotional text |
| Source Sans 3     | `--font-source-sans`   | Body, UI labels           |

---

## Rules

1. **No hardcoded legacy hex** — If you see `#C97B5A`, `#6B8E6F`, `#1F2A36`, or `#4F6E54` anywhere in the codebase, replace immediately with the corresponding brand token.
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
