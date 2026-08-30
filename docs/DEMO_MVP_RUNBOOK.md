# EMOPET — MVP demo runbook

Status: `DEMO_FREEZE_CANDIDATE`

This runbook is for a controlled software demonstration. It is not a Product V1 release, a clinical demonstration, a manufacturing release, or evidence of live MAT/TAG hardware validation.

## Demo objective

Tell the EMOPET idea as a living world, not as a list of software modules.

The audience should leave with four ideas:

1. EMOPET starts from the dog's daily rhythms and context, not from a generic health score.
2. The affective model is described through a cautious Valence–Arousal space plus uncertainty / capture quality, with abstention when evidence is insufficient.
3. Breiz explains observations and provenance without turning correlation into diagnosis or unsupported emotional labels.
4. MAT + TAG are the sensing architecture beneath the experience; the demo does not pretend final hardware, CE, tooling or Product V1 are frozen.

Primary demo URL: `/demo`.

The `/demo` surface uses explicit controlled fixtures. Do not describe its values as live sensor measurements.

## Presenter script

### 0:00–1:30 — Enter the world

Open `/demo` at the hero and scroll to **Explore le monde de Gus**.

Say:

> EMOPET is designed as a living companion system. Instead of opening a dashboard full of scores, you enter the dog's world and explore what the system has actually observed.

Point out the persistent demo banner and the four places in the world: **La maison**, **L'observatoire**, **Breiz**, **Le labo**.

### 1:30–3:00 — La maison: understand the rhythm

Open **Comprendre le rythme**.

Show the simulated morning sequence: rest → short wake phase → lower activation.

Core message:

> A repeated rhythm is an observation. It is not automatically “anxiety”, “joy” or “stress”. EMOPET preserves the sequence and its confidence before interpretation.

Do not call the fixture a medical measurement.

### 3:00–5:00 — L'observatoire: Valence–Arousal, not a health score

Open **Voir la dynamique**.

Show the Valence–Arousal map, the uncertainty halo and the descriptive readout.

Core message:

> We deliberately do not display a health score. The demo shows a descriptive position in a Valence–Arousal space, together with uncertainty. If capture quality is insufficient, the system can abstain rather than manufacture a number.

Allowed language: activation descriptive, valence descriptive, confidence, uncertainty, observation.

Avoid language implying direct emotional mind-reading or diagnosis.

### 5:00–7:00 — Breiz: explain and explore

Open **Explorer avec contexte**.

Read the scripted example. Show the provenance chips and the proposed next exploration.

Core message:

> Breiz connects observations, guardian-provided context and provenance. It explains what the system can support and makes uncertainty visible.

If the full `/breiz` conversational surface is not explicitly QA-cleared for the meeting, remain on the self-contained demo scene.

### 7:00–9:00 — Le labo: reveal the sensing layer

Open **Voir l'invisible**.

Explain the chain:

`MAT + TAG → signal quality → cautious inference / abstention → Breiz explanation`

State explicitly that sensor coverage and firmware values on the demo page are fixtures.

For MOKO / engineering audiences, separate software architecture maturity from mechanical / PCB / tooling maturity.

### 9:00–10:00 — Close

Close with:

> The MVP demonstrates the product idea, the software contract and the safety boundaries. The next step is progressive integration with validated hardware, authenticated accounts and controlled field data — not a silent jump to Product V1.

## Design intent for this demo

The demo should feel closer to a small explorable companion world than to a SaaS admin dashboard.

Design principles:

- use the official EMOPET navy / orange / teal / cream palette and existing logo authority;
- preserve Fraunces for emotional / narrative hierarchy and Source Sans 3 for interface copy;
- favor large product-story statements, full visual scenes and deliberate whitespace;
- use the existing isometric living-world language as the navigation metaphor;
- use motion only to communicate life, confidence or system state; respect `prefers-reduced-motion`;
- avoid nested-card density, generic dashboard composition and decorative gradients with no semantic role;
- do not use any visual treatment that makes a descriptive state look like a clinical score.

## Claims allowed in the demo

- `MVP software demonstration`
- `controlled / simulated demo data`
- `non-medical canine wellbeing observations`
- `Valence–Arousal descriptive representation with uncertainty`
- `confidence / quality gating and abstention logic`
- `Breiz non-diagnostic explanation layer`
- `MAT + TAG target architecture`
- `owner-scoped backend data export exists in the codebase`
- `CI, build, tests and security gates have current evidence on main`

## Claims prohibited in the demo

- a generic `health score` or a numerical score represented as health;
- live MAT/TAG readings unless a separately validated live integration is actually connected;
- medical, diagnostic or unsupported emotional-state conclusions;
- CE conformity;
- Product V1 freeze;
- manufacturing release;
- tooling authorization;
- production-ready authentication;
- production deployment readiness;
- final mechanical / PCB / enclosure geometry;
- real-user beta readiness.

## Known boundaries before external demo

- Backend register/login/refresh remain stubs; do not make account creation part of the demo path.
- The dedicated `/demo` route is deliberately self-contained and does not require authentication.
- Some legacy application surfaces still contain text-encoding drift; do not improvise outside the approved demo path until those surfaces are QA-cleared.
- Full live-hardware integration is outside this software demo freeze.

## Pre-demo checklist

- Open the preview deployment from `demo/mvp-freeze`.
- Confirm `/demo` loads without authentication.
- Enter all four world locations.
- Confirm no visible component says `health score` or implies a clinical score.
- Confirm the Valence–Arousal state includes a visible uncertainty region.
- Check desktop viewport and one mobile-sized viewport.
- Confirm no mojibake / broken accents on `/demo`.
- Confirm the banner says controlled/simulated data and non-clinical.
- Confirm there are no console errors that affect the demo path.
- Confirm the current branch passes web typecheck, tests and build.
- Keep a static screenshot or screen recording as fallback for presentation-day network failure.

## Freeze rule

After the demo candidate passes CI and visual smoke testing, only demo-blocking fixes are allowed on `demo/mvp-freeze` until the presentation is complete.
